# ♻️ Recoopera 📊✅

Sistema web para **renegociação e repactuação de contratos**, com **motor de cálculo financeiro**, **regras de política de crédito** e **fluxo automatizado de propostas**.

---

## ✨ Principais recursos
- 🔎 Busca de contratos por CPF
- 📄 Importação de contratos via **Excel**
- ⚖️ Exclusão automática de contratos ajuizados
- 🧮 Motor de cálculo de renegociação
- 📉 Consolidação de contratos pela **menor taxa**
- 💰 Aplicação de desconto conforme política
- 🧾 Geração de proposta (simulação e final)
- 🔐 Autenticação via **JWT**
- 👥 Perfis administrativos
- 📝 Auditoria e logs de ações
- 📑 Geração de relatório e PDF da negociação

---

## 🧱 Arquitetura

O projeto é composto por:

- **Backend (API)**: ASP.NET Core  
  - Rota padrão: `api/[controller]`
  - Banco: **SQL Server**
  - ORM: **Entity Framework Core**
  - Autenticação: **JWT Bearer**
  - Motor de cálculo isolado na camada `Application`
  - Regras de campanha via `taxas-campanha.json`
  - Execução em produção via **publish (Release)**

- **Frontend (Web)**: React + Vite  
  - Consumo da API via **Axios**
  - Controle de sessão via **Context API**
  - Rotas protegidas
  - Geração de PDF no frontend

---

## 🛠️ Tecnologias

### Backend
- ASP.NET Core
- Entity Framework Core
- SQL Server
- JWT Authentication
- Excel (Local / SharePoint)
- Middleware de correlação e auditoria

### Frontend
- React
- Vite
- Axios
- Context API
- JavaScript
- Geração de PDF (html2canvas)

---

## ✅ Pré-requisitos

### Para rodar localmente
- .NET SDK
- Node.js (LTS) + NPM
- SQL Server
- Connection string configurada
- Arquivos Excel configurados (local ou SharePoint)

---

## 📁 Estrutura do repositório

```text
Recoopera
├── Application                     # Camada de aplicação
│   ├── Calculos                    # Motor de renegociação
│   ├── Data                        # Auth e usuários
│   ├── DTOs                        # Requests / Responses
│   ├── Enums
│   ├── Interfaces
│   └── Services                    # Regras de negócio
│
├── Domain                          # Domínio
│   ├── Entities
│   └── ValueObjects
│
├── Infrastructure                  # Infraestrutura
│   ├── Data                        # DbContext
│   ├── Excel                       # Integração Excel
│   ├── Repositories
│   ├── Security                    # JWT
│   └── Middlewares
│
├── Controllers                     # Controllers da API
│
├── Migrations                      # Migrations EF Core
│
├── recoopera-front                 # Frontend React (Vite)
│   ├── public
│   ├── src
│   │   ├── components
│   │   ├── contexts
│   │   ├── pages
│   │   ├── rules                   # Regras de cálculo
│   │   ├── services
│   │   └── utils
│   └── package.json
│
├── wwwroot                         # Frontend buildado (produção)
│
├── taxas-campanha.json             # Tabela de campanha
├── Program.cs
├── Recoopera.csproj
└── Recoopera.sln

# 🛠️ Manual de Instalação, Atualização e Manutenção ⚙️🖥️

Manual técnico para instalação e operação dos sistemas:

- ♻️ **Recoopera API**
- 📁 **ArquivosWenApi**

Ambos rodam em **servidor Windows**, via **dotnet publish**, executados como **Serviços do Windows**.

---

## 🧱 Arquitetura de execução

- Sistema operacional: **Windows Server**
- Runtime: **.NET (via publish)**
- Execução: **Windows Service**
- Frontend:
  - Buildado e servido via `wwwroot` **OU**
  - Frontend separado (quando aplicável)

---

## 📦 Pré-requisitos do servidor

- Windows Server ou Windows 10/11
- .NET Runtime compatível com os projetos
- SQL Server (Local / Express / Standard)
- Permissão para:
  - Criar serviços do Windows
  - Abrir portas no firewall
- Acesso ao banco de dados
- PowerShell ou CMD como Administrador

---

## 📁 Estrutura recomendada no servidor

```text
C:\Sistemas\
├── Recoopera\
│   ├── app\
│   ├── logs\
│   └── publish\
│
├── ArquivosWeb\
│   ├── app\
│   ├── logs\
│   └── publish\
