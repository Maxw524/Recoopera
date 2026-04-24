# CoopSystem - Plataforma Modular Cooperativista

[![.NET](https://img.shields.io/badge/.NET-8.0-purple.svg)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://docker.com/)
[![License](https://img.shields.io/badge/License-Private-red.svg)](LICENSE)

## 📋 Visão Geral

CoopSystem é uma plataforma modular desenvolvida em .NET 8.0 e React 18, projetada para gerenciar operações cooperativistas com arquitetura limpa, segurança robusta e alta escalabilidade.

### 🎯 Objetivos

- **Modularidade**: Sistema extensível com módulos independentes
- **Segurança**: Autenticação JWT e autorização granular
- **Performance**: Cache inteligente e otimizações
- **Manutenibilidade**: Clean Architecture e testes automatizados
- **Escalabilidade**: Deploy em containers e microserviços

## 🏗️ Arquitetura

```
CoopSystem/
├── 📁 src/                    # Backend .NET 8.0
│   └── 📁 CoopSystem.API/     # API Principal
├── 📁 modules/                # Módulos de Negócio
│   ├── 📁 Core/             # Componentes Reutilizáveis
│   └── 📁 Recoopera.Module/  # Módulo de Recuperação
├── 📁 frontend/              # Frontend React 18
├── 📁 tests/                 # Testes Automatizados
├── 📁 docs/                  # Documentação
├── 📁 scripts/               # Scripts de Automação
├── 📁 deploy/                # Configurações Deploy
└── 📁 shared/                # Recursos Compartilhados
```

## 🚀 Módulos Atuais

### 📊 Recoopera Module
Módulo de recuperação de crédito e renegociação de contratos.

**Funcionalidades:**
- ✅ Renegociação de contratos
- ✅ Cálculos financeiros avançados
- ✅ Importação de planilhas Excel
- ✅ Gestão de taxas e campanhas
- ✅ Dashboard analítico

**Endpoints Principais:**
```
GET    /api/renegociacoes/{cpfCnpj}              # Buscar contratos
POST   /api/renegociacoes/consolidar              # Consolidar renegociação
POST   /api/renegociacoes/simular                 # Simular valores
```

## 🔧 Tecnologias

### Backend
- **.NET 8.0** - Framework principal
- **Entity Framework Core** - ORM
- **SQL Server** - Banco de dados
- **Redis** - Cache distribuído
- **JWT Bearer** - Autenticação
- **AutoMapper** - Mapeamento de objetos
- **FluentValidation** - Validação

### Frontend
- **React 18** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool
- **TailwindCSS** - Framework CSS
- **React Router** - Navegação
- **Axios** - Client HTTP

### Infraestrutura
- **Docker** - Containers
- **Docker Compose** - Orquestração
- **Nginx** - Reverse proxy
- **Prometheus** - Monitoramento
- **Grafana** - Dashboards

## 🚀 Quick Start

### Pré-requisitos
- **.NET 8.0 SDK**
- **Node.js 18+**
- **Docker e Docker Compose**
- **SQL Server 2019+** ou **PostgreSQL 13+**

### 1. Clonar Repositório
```bash
git clone https://github.com/sua-org/coopsystem.git
cd coopsystem
```

### 2. Configurar Ambiente
```bash
# Copiar variáveis de ambiente
cp deploy/docker/.env.example .env

# Editar configurações
nano .env
```

### 3. Iniciar com Docker
```bash
# Build e start
docker-compose -f deploy/docker/docker-compose.yml up -d

# Verificar status
docker-compose ps
```

### 4. Acessar Aplicação
- **Frontend**: http://localhost
- **API**: http://localhost:5000
- **API Docs**: http://localhost:5000/swagger
- **Monitoramento**: http://localhost:3000 (Grafana)

## 🧪 Testes

### Executar Todos os Testes
```bash
./scripts/test.sh all
```

### Testes Unitários
```bash
./scripts/test.sh unit
```

### Testes de Integração
```bash
./scripts/test.sh integration
```

### Testes E2E
```bash
./scripts/test.sh e2e
```

## 📦 Build e Deploy

### Build para Produção
```bash
./scripts/build.sh production
```

### Deploy Automatizado
```bash
./scripts/deploy.sh production latest
```

### Rollback
```bash
./scripts/rollback.sh backup-20240304_143022
```

## 📚 Documentação

- **[Arquitetura](docs/ARCHITECTURE.md)** - Detalhes da arquitetura
- **[API](docs/API.md)** - Documentação da API
- **[Deploy](docs/DEPLOYMENT.md)** - Guia de deployment
- **[Módulos](docs/MODULES.md)** - Guia de desenvolvimento de módulos

## 🔐 Segurança

### Autenticação
- **JWT Tokens** com refresh automático
- **Password Hashing** BCrypt
- **Rate Limiting** por endpoint
- **CORS** configurado

### Autorização
- **Role-based**: Admin, Operador, Juridico, etc.
- **Module-based**: Acesso por módulo
- **Endpoint-based**: Granularidade fina

## 📊 Monitoramento

### Métricas Disponíveis
- **Performance**: Tempo de resposta
- **Business**: KPIs específicas
- **Infrastructure**: CPU, Memory, Disk
- **Security**: Tentativas de acesso

### Logs
- **Structured**: JSON format
- **Centralized**: Agregador único
- **Correlation IDs**: Rastreabilidade

## 🔄 CI/CD

### Pipeline Stages
1. **Lint** - Code quality
2. **Test** - Automated tests
3. **Build** - Compilation
4. **Security** - Vulnerability scan
5. **Deploy** - Automated deployment

### Branch Strategy
- **main** - Produção
- **develop** - Desenvolvimento
- **feature/*** - Novas funcionalidades
- **hotfix/*** - Correções urgentes

## 🤝 Contribuição

### Como Contribuir
1. **Fork** o projeto
2. **Branch** para feature/módulo
3. **Implementar** seguindo padrões
4. **Testar** cobertura >80%
5. **PR** para review

### Padrões de Código
- **C#**: Microsoft Style Guidelines
- **TypeScript**: ESLint + Prettier
- **Commits**: Conventional Commits
- **Branches**: Git Flow

## 📋 Roadmap

### v2.1 (Próximo)
- [ ] **CRM Module** - Gestão de relacionamento
- [ ] **Finance Module** - Contas a pagar/receber
- [ ] **Report Module** - Dashboards avançados
- [ ] **Notification Module** - Email, SMS, Push

### v2.2 (Futuro)
- [ ] **Audit Module** - Log de operações
- [ ] **Workflow Module** - BPM integrado
- [ ] **Mobile App** - React Native
- [ ] **AI Integration** - Machine Learning

## 📞 Suporte

### Canais
- **Issues**: GitHub Issues
- **Docs**: Wiki do projeto
- **Email**: support@coopsystem.com
- **Slack**: #coopsystem-dev

### Tempo de Resposta
- **Crítico**: 1 hora
- **Alto**: 4 horas
- **Médio**: 24 horas
- **Baixo**: 72 horas

## 📄 Licença

Este projeto é licenciado sob a Licença Privada da Cooperativa. Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

**CoopSystem** - Plataforma Modular Cooperativista  
Versão: 2.0.0  
Framework: .NET 8.0 + React 18  
Arquitetura: Clean Architecture + DDD

**Made with ❤️ by CoopSystem Team**
