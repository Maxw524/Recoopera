// src/rules/repactuacaoRules.js
import { obterTaxaCampanha } from '../utils/taxasCampanha';

/**
 * Piso mínimo para TAXAS VINDAS DA CAMPANHA (desconto):
 * nunca deixamos a taxa da campanha ficar abaixo de 1,59% a.m.
 * Observação: a taxa de origem NUNCA é "subida". Se a origem for menor que 1,59%,
 * prevalece a origem.
 */
const TAXA_MIN_DESCONTO = 1.59; // % a.m.

/**
 * Mínimo histórico da política (mensagem informativa).
 * Se taxa de origem < 1,50% a.m., prevalece a origem (regra da política original).
 */
const TAXA_MIN_POLITICA_HISTORICA = 1.50; // % a.m.

function extrairTaxa(c) {
  return (
    c.taxaAm ??
    c.taxa ??
    c.taxaContrato ??
    c.taxaMensal ??
    NaN
  );
}

function extrairDiasAtraso(c) {
  // Lê tanto diasAtraso (seu mapeamento) quanto diasEmAtraso (fallback)
  return Number((c.diasAtraso ?? c.diasEmAtraso ?? 0)) || 0;
}

function extrairGarantiaRealOrigem(c) {
  // Ajuste aqui caso seu backend use outro nome de campo:
  // exemplos: c.possuiGarantiaReal, c.garantiaRealAtiva, c.temGarantiaRealOrigem
  return (
    c.possuiGarantiaReal === true ||
    c.garantiaRealAtiva === true ||
    c.temGarantiaRealOrigem === true
  );
}

function extrairValorDevido(c) {
  // Alinha com o que a UI usa: totalDevido / saldoBase normalizados
  return (
    Number(
      c.totalDevido ??
      c.saldoBase ??
      c.valorRecalculado ??
      c.valorSaldoContabilBruto ??
      0
    ) || 0
  );
}

/**
 * Motor unificado (novo + compat):
 *
 * @param {{
 *   contratos: Array<any>,
 *   entradaPercentual: number,
 *   prazo: number,
 *
 *   // NOVO reforço REAL na nova operação
 *   adicionarGarantiaReal?: boolean,
 *   valorGarantia?: number,
 *
 *   // LEGADO (compat): se vier temGarantiaReal e não vier adicionarGarantiaReal,
 *   // tratamos como "adicionarGarantiaReal = temGarantiaReal"
 *   temGarantiaReal?: boolean,
 *
 *   // Aval
 *   temAvalista?: boolean,
 *   avalEhSocio?: boolean,
 *
 *   // Critério de elegibilidade por atraso:
 *   //  - 'todos' (default): todos os contratos >= 90 dias
 *   //  - 'algum' : basta pelo menos um >= 90
 *   criterioAtraso?: 'todos' | 'algum',
 *
 *   // Forçar aplicação de campanha mesmo sem atender atraso (UI)
 *   forcarCampanha?: boolean
 * }} args
 *
 * @returns {{
 *   taxaOriginal:number,
 *   taxaPolitica:number|null,        // taxa da campanha JÁ com o piso 1,59 aplicado (se houver)
 *   taxaPoliticaBruta?:number|null,  // taxa bruta da matriz (antes do piso) — para debug
 *   taxaFinal:number,                // min(taxaOriginal, taxaPolitica pós-piso)
 *   descontoAplicado:boolean,        // true se taxaFinal < taxaOriginal
 *   alertas:string[],
 *   debug?: {
 *     dias:number[],
 *     criterioAtraso:'todos'|'algum',
 *     todosAdimplentes:boolean,
 *     todosComAtrasoMaior90:boolean,
 *     algumComAtrasoMaior90:boolean,
 *     elegivelCampanhaBase:boolean,
 *     elegivelCampanha:boolean,
 *     forcarCampanha:boolean,
 *     possuiGarantiaRealOrigem:boolean,
 *     reforco:'SEM_REFORCO'|'AVAL'|'REAL',
 *     valorGarantia:number,
 *     maiorValorDevido:number,
 *     coberturaGarantiaRelMaiorDevido:number,
 *     pisoMinimoDesconto:number,
 *     taxaPoliticaAposPiso?:number|null,
 *     prevaleceuOrigem:boolean,
 *     bloqueioTaxaOrigemMinima:boolean
 *   }
 * } | null}
 */
export function calcularTaxaPolitica({
  contratos,
  entradaPercentual,
  prazo,

  // novo
  adicionarGarantiaReal,
  valorGarantia = 0,

  // legado (compat)
  temGarantiaReal,

  // aval
  temAvalista,
  avalEhSocio = false,

  // critério atraso
  criterioAtraso = 'todos', // 'todos' | 'algum'

  // 👇 NOVO - vindo do front
  forcarCampanha = false,
}) {
  if (!contratos || contratos.length === 0) return null;

  const alertas = [];

  // 1) Menor taxa de origem (baseline)
  const taxasOrigem = contratos
    .map(extrairTaxa)
    .filter(v => typeof v === 'number' && !Number.isNaN(v));

  if (taxasOrigem.length === 0) {
    alertas.push('Não foi possível identificar a taxa de origem dos contratos.');
    return {
      taxaOriginal: NaN,
      taxaPolitica: null,
      taxaFinal: NaN,
      descontoAplicado: false,
      alertas
    };
  }

  const taxaOriginal = Math.min(...taxasOrigem);

  // Info histórica
  if (taxaOriginal < TAXA_MIN_POLITICA_HISTORICA) {
    alertas.push(
      `Taxa de origem (${taxaOriginal.toFixed(2)}% a.m.) é inferior à mínima histórica da política (${TAXA_MIN_POLITICA_HISTORICA.toFixed(2)}% a.m.). Prevalece a origem.`
    );
  }

  // 2) Estado de atraso/adimplência (elegibilidade)
  const dias = contratos.map(extrairDiasAtraso);
  const todosAdimplentes = dias.every((d) => d <= 0);

  // Agora usamos 90 dias como critério
  const todosComAtrasoMaior90 = dias.length > 0 && dias.every((d) => d >= 90);
  const algumComAtrasoMaior90 = dias.some((d) => d >= 90);

  // Critério de elegibilidade por atraso
  // 'todos'  -> todos os contratos >= 90 dias
  // 'algum'  -> basta 1 contrato >= 90 dias
  const atendeAtraso =
    criterioAtraso === 'todos' ? todosComAtrasoMaior90 : algumComAtrasoMaior90;

  // Garantia real na ORIGEM
  const possuiGarantiaRealOrigem = contratos.some(extrairGarantiaRealOrigem);

  // elegibilidade base (sem considerar "forçar campanha")
  const elegivelCampanhaBase =
    !todosAdimplentes && atendeAtraso && !possuiGarantiaRealOrigem;

  // elegibilidade final (considera forçar campanha, mas ainda respeita garantia real de origem)
  const elegivelCampanha =
    elegivelCampanhaBase || (forcarCampanha && !possuiGarantiaRealOrigem);

  if (todosAdimplentes) {
    alertas.push(
      'Operação adimplente/adequação: usa-se a menor taxa de origem entre os contratos.'
    );
  }

  // Só mostra "campanha não se aplica" se NÃO estiver forçando
  if (!atendeAtraso && !todosAdimplentes && !forcarCampanha) {
    const msg =
      criterioAtraso === 'todos'
        ? 'Existem contratos com atraso < 90 dias — campanha de desconto de taxa não se aplica (critério: todos ≥ 90).'
        : 'Nenhum contrato com atraso ≥ 90 dias — campanha de desconto de taxa não se aplica.';
    alertas.push(msg);
  }

  // Quando força campanha, mas a base não atendia atraso, registra alerta específico
  if (forcarCampanha && !elegivelCampanhaBase && !possuiGarantiaRealOrigem) {
    alertas.push(
      'Campanha de taxa forçada pela interface, apesar de existirem contratos com atraso < 90 dias.'
    );
  }

  if (possuiGarantiaRealOrigem) {
    alertas.push(
      'Contrato(s) de origem com garantia real: descontos da campanha sobre taxa não se aplicam.'
    );
  }

  // 3) Maior valor devido (para validar reforço REAL)
  const maiorValorDevido = Math.max(
    0,
    ...contratos.map(extrairValorDevido)
  );

  // 4) Reforço na nova operação (matriz)
  // Compat: se "adicionarGarantiaReal" não vier, usamos "temGarantiaReal"
  const usarAdicionarGarantia = (typeof adicionarGarantiaReal === 'boolean')
    ? adicionarGarantiaReal
    : (typeof temGarantiaReal === 'boolean' ? temGarantiaReal : false);

  const valorGarantiaNum = Number(valorGarantia) || 0;

  let reforco = 'SEM_REFORCO';
  if (usarAdicionarGarantia) {
    if (valorGarantiaNum > 0) {
      // NOVA REGRA: só ativa REAL se a garantia cobrir pelo menos o MAIOR valor devido
      if (valorGarantiaNum >= maiorValorDevido) {
        reforco = 'REAL';
      } else {
        alertas.push(
          `Valor da nova garantia (${valorGarantiaNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) ` +
          `inferior ao maior valor devido entre os contratos selecionados ` +
          `(${maiorValorDevido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}). Considerando "sem reforço".`
        );
        reforco = 'SEM_REFORCO';
      }
    } else {
      alertas.push('Nova garantia real marcada sem valor válido — considerando "sem reforço".');
      reforco = 'SEM_REFORCO';
    }
  } else if (temAvalista && !avalEhSocio) {
    reforco = 'AVAL';
  } else {
    reforco = 'SEM_REFORCO';
    if (temAvalista && avalEhSocio) {
      alertas.push('Aval de sócio não é considerado como reforço para desconto de taxa.');
    }
  }

  // 5) Tabela de campanha + piso 1,59%
  let taxaPoliticaBruta = null;
  let taxaPoliticaAposPiso = null;

  if (elegivelCampanha) {
    taxaPoliticaBruta = obterTaxaCampanha({
      entradaPercentual,
      prazoMeses: prazo,
      reforco
    });

    if (taxaPoliticaBruta == null) {
      if (entradaPercentual < 10) {
        alertas.push('Entrada inferior a 10%. Permitido, porém fora da sugestão da política.');
      } else {
        alertas.push('Não foi possível enquadrar a taxa da campanha com as condições informadas.');
      }
    } else {
      // Aplica o piso 1,59% a.m. ao resultado da campanha
      taxaPoliticaAposPiso = Math.max(taxaPoliticaBruta, TAXA_MIN_DESCONTO);
      if (taxaPoliticaAposPiso > taxaPoliticaBruta) {
        alertas.push(
          `Piso de desconto aplicado: taxa da campanha ajustada para ${taxaPoliticaAposPiso.toFixed(2)}% a.m. (mín. ${TAXA_MIN_DESCONTO.toFixed(2)}% a.m.).`
        );
      }
    }
  }

  // 6) Resultado final — prevalência da origem
  let taxaFinal;
  let prevaleceuOrigem = false;



  if (taxaPoliticaAposPiso != null && Number.isFinite(taxaPoliticaAposPiso)) {
    taxaFinal = Math.min(taxaOriginal, taxaPoliticaAposPiso);
    prevaleceuOrigem = taxaFinal === taxaOriginal;
  } else {
    taxaFinal = taxaOriginal;
    prevaleceuOrigem = true;
  }

  const descontoAplicado = taxaFinal < taxaOriginal;

  return {
    taxaOriginal,
    taxaPolitica: taxaPoliticaAposPiso ?? null,
    taxaPoliticaBruta,
    taxaFinal,
    descontoAplicado,
    alertas,
    debug: {
      dias,
      criterioAtraso,
      todosAdimplentes,
      todosComAtrasoMaior90,
      algumComAtrasoMaior90,
      elegivelCampanha,
      possuiGarantiaRealOrigem,
      reforco,
      valorGarantia: valorGarantiaNum,
      maiorValorDevido,
      coberturaGarantiaRelMaiorDevido:
        maiorValorDevido > 0 ? (valorGarantiaNum / maiorValorDevido) : 0,
      pisoMinimoDesconto: TAXA_MIN_DESCONTO,
      taxaPoliticaAposPiso: taxaPoliticaAposPiso ?? null,
      prevaleceuOrigem,
      bloqueioTaxaOrigemMinima: taxaOriginal < TAXA_MIN_POLITICA_HISTORICA
    }
  };
}