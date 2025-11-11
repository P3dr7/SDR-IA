# 🤖 SDR Agent - Sistema Automatizado de Vendas

Sistema completo de agente SDR (Sales Development Representative) automatizado com IA, composto por um backend inteligente usando Google Gemini e um frontend de chat responsivo.

## 📋 Visão Geral

Este projeto implementa um assistente virtual de vendas que:

- 🤝 **Qualifica leads** através de conversas naturais
- 📝 **Registra informações** automaticamente no CRM (Pipefy)
- 📅 **Agenda reuniões** via Google Calendar ou Calendly
- 💬 **Mantém contexto** das conversas com histórico persistente
- 🎯 **Usa IA** (Google Gemini) para respostas inteligentes e function calling

## 🏗 Arquitetura

```
teste-verzel/
├─ client/SDR-Front/     # Frontend React + Vite
│  ├─ src/
│  │  ├─ components/     # Chat interface
│  │  └─ utils/          # Session & API
│  └─ README.md
│
└─ server/               # Backend Fastify + Gemini
   ├─ src/
   │  ├─ routes/         # Endpoints REST
   │  └─ services/       # Gemini, Pipefy, Calendar
   ├─ script/            # Utilitários OAuth/Discovery
   └─ README.md
```

## ✨ Funcionalidades

### Frontend (React)

- ✅ **Mobile-First** - Design responsivo otimizado para todos os dispositivos
- ✅ **Acessibilidade** - Navegação completa por teclado (Tab/Enter/Esc) + ARIA labels
- ✅ **Sessão Anônima** - UUID gerado automaticamente com timeout de 30 minutos
- ✅ **Persistência Local** - Histórico salvo no localStorage
- ✅ **Dark Mode** - Suporte automático ao tema do sistema
- ✅ **Loading States** - Indicadores visuais durante requisições
- ✅ **Tratamento de Erros** - Feedback claro de falhas de conexão

### Backend (Node.js)

- 🧠 **IA Conversacional** - Google Gemini (`gemini-2.5-flash`) com function calling
- 🔄 **Orquestração Inteligente** - Decide quando registrar leads ou agendar
- 📊 **CRM Integration** - Pipefy GraphQL com detecção de duplicatas
- 📅 **Agendamento Flexível** - Google Calendar (OAuth2) ou Calendly
- 🎭 **Modo Mock** - Funciona sem integrações para desenvolvimento
- 🔍 **Debug Tools** - Scripts para descobrir configurações de APIs

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 18+
- npm
- Chave API do Google Gemini ([obter aqui](https://aistudio.google.com/apikey))
- (Opcional) Credenciais Pipefy, Google Calendar ou Calendly

### 1. Clone o Repositório

```powershell
git clone https://github.com/P3dr7/SDR-IA.git
cd SDR-IA
```

### 2. Configurar Backend

```powershell
cd server
npm install
Copy-Item .env.example .env
# Edite .env e adicione pelo menos GEMINI_API_KEY
npm run dev
```

O servidor estará rodando em `http://localhost:3000`

### 3. Configurar Frontend

```powershell
cd ../client/SDR-Front
npm install
# Opcional: criar .env com VITE_API_URL=http://localhost:3000
npm run dev
```

O frontend estará acessível em `http://localhost:5173`

## ⚙️ Configuração

### Variáveis de Ambiente Essenciais

#### Backend (`server/.env`)

**Obrigatória:**

```env
GEMINI_API_KEY=sua_chave_aqui
```

**Opcionais (usa mock se ausentes):**

```env
# CRM
PIPEFY_API_TOKEN=token_pipefy
PIPEFY_PIPE_ID=123456789

# Agendamento (escolha um)
USE_GOOGLE_CALENDAR=true
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...  # gerar com: node script/oauth-setup.js

# OU
USE_GOOGLE_CALENDAR=false
CALENDLY_API_TOKEN=token
CALENDLY_EVENT_TYPE_URI=https://api.calendly.com/event_types/...

# CORS (importante para produção)
CORS_ORIGIN=https://seu-frontend.com,http://localhost:5173
```

#### Frontend (`client/SDR-Front/.env`)

```env
VITE_API_URL=http://localhost:3000
```

## 📡 API Endpoints

| Método | Rota                         | Descrição                                  |
| ------ | ---------------------------- | ------------------------------------------ |
| POST   | `/api/chat`                  | Envia mensagem e recebe resposta do agente |
| GET    | `/api/conversations`         | Lista conversas ativas (debug)             |
| DELETE | `/api/chat/:conversation_id` | Remove conversa da memória                 |
| GET    | `/health`                    | Health check                               |
| GET    | `/test-calendar`             | Testa integração com calendário            |

## 🧠 Como Funciona

### Fluxo de Conversação

```
1. Usuário envia mensagem pelo frontend
   ↓
2. Chat mantém sessão com UUID anônimo
   ↓
3. Backend recebe mensagem + conversation_id
   ↓
4. Gemini processa com contexto completo do histórico
   ↓
5. Se necessário, Gemini chama funções:
   • registrarLead → Pipefy
   • buscarHorariosDisponiveis → Calendar/Calendly
   • agendarReuniao → Calendar/Calendly + Pipefy
   ↓
6. Resposta retorna ao frontend
   ↓
7. Histórico salvo no localStorage
```

### Funções Disponíveis para IA

1. **`registrarLead`** - Cria/atualiza card no Pipefy com dados do lead
2. **`buscarHorariosDisponiveis`** - Retorna slots disponíveis na agenda
3. **`agendarReuniao`** - Agenda evento e atualiza CRM com link da reunião

## 🚢 Deploy

### Frontend (Vercel)

```powershell
cd client/SDR-Front
npm run build

# Deploy via Vercel CLI
vercel
```

**Configurar na Vercel:**

- Variável: `VITE_API_URL` = URL do backend em produção

📖 [Guia completo de deploy do frontend](./client/SDR-Front/DEPLOY.md)

### Backend (Vercel Serverless)

```powershell
cd server
vercel
```

**Configurar na Vercel:**

- `GEMINI_API_KEY` (obrigatório)
- `CORS_ORIGIN` = URL do frontend (ex: `https://seu-app.vercel.app`)
- Demais variáveis opcionais conforme necessário

📖 [Guia completo de deploy do backend](./server/DEPLOY.md)

## 🛠 Scripts Utilitários

### Backend

```powershell
# Gerar refresh token do Google Calendar
node script/oauth-setup.js

# Descobrir Event Type do Calendly
node script/discover-calendly.js

# Mapear campos do Pipefy
node script/discover-pipefy-fields.js
```

## 🧪 Testes

### Testar Backend (PowerShell)

```powershell
# Health check
curl -Method GET -Uri http://localhost:3000/health

# Enviar mensagem
curl -Method POST -Uri http://localhost:3000/api/chat `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"message":"Olá, quero conhecer a Verzel"}'
```

### Testar Frontend

1. Acesse http://localhost:5173
2. Digite uma mensagem no chat
3. O agente responderá e guiará a conversa
4. Teste os atalhos de teclado (Enter, Esc)
5. Abra em outro dispositivo para testar responsividade

## 📁 Estrutura Detalhada

### Frontend

```
client/SDR-Front/
├─ src/
│  ├─ components/
│  │  ├─ Chat.jsx          # Componente principal
│  │  └─ Chat.css          # Estilos mobile-first
│  ├─ utils/
│  │  ├─ session.js        # Gestão de sessão e localStorage
│  │  └─ api.js            # Cliente HTTP
│  ├─ App.jsx
│  └─ main.jsx
├─ public/
├─ vercel.json             # Config Vercel SPA
└─ .env.example
```

### Backend

```
server/
├─ src/
│  ├─ routes/
│  │  └─ chat.js           # Orquestração com Gemini
│  └─ services/
│     ├─ gemini.service.js       # Config IA + tools
│     ├─ pipefy.service.js       # CRM integration
│     ├─ agenda.service.js       # Abstração agendamento
│     └─ google-calendar.service.js  # Google Calendar
├─ script/
│  ├─ oauth-setup.js       # Setup OAuth Google
│  ├─ discover-calendly.js
│  └─ discover-pipefy-fields.js
├─ server.js               # Entry point Fastify
├─ vercel.json             # Config Vercel Serverless
└─ .env.example
```

## 🔐 Segurança

- ✅ Nunca commite arquivos `.env`
- ✅ Use HTTPS em produção
- ✅ Configure CORS corretamente (não use `origin: true` em prod)
- ✅ Implemente rate limiting para APIs públicas
- ✅ Valide e sanitize inputs do usuário
- ✅ Mantenha dependências atualizadas

## 🐛 Troubleshooting

### Erro de CORS

**Causa:** Frontend e backend em domínios diferentes  
**Solução:** Configure `CORS_ORIGIN` no backend com URL do frontend

### Chat não conecta

**Causa:** `VITE_API_URL` incorreto ou backend offline  
**Solução:** Verifique se backend responde em `/health`

### Horários sempre mock

**Causa:** Credenciais de calendário não configuradas  
**Solução:** Configure Google Calendar ou Calendly no `.env`

### Gemini não responde

**Causa:** `GEMINI_API_KEY` inválida ou ausente  
**Solução:** Verifique chave em https://aistudio.google.com/apikey

## 🛣 Roadmap

- [ ] Persistência de conversas (Redis/Postgres)
- [ ] Autenticação (JWT)
- [ ] Dashboard administrativo
- [ ] Webhooks Pipefy
- [ ] Métricas e analytics
- [ ] Testes automatizados (E2E + unitários)
- [ ] Suporte a múltiplos idiomas
- [ ] Integração com WhatsApp/Telegram

## 🤝 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'feat: Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📚 Documentação Adicional

- [Frontend README](./client/SDR-Front/README.md) - Detalhes da interface
- [Frontend DEPLOY](./client/SDR-Front/DEPLOY.md) - Deploy Vercel frontend
- [Backend README](./server/README.md) - API e serviços
- [Backend DEPLOY](./server/DEPLOY.md) - Deploy Vercel backend

## 📄 Licença

ISC

## 🙋 Suporte

Para dúvidas ou problemas:

- Abra uma [issue](https://github.com/P3dr7/SDR-IA/issues)
- Consulte a documentação dos serviços específicos
- Revise os logs no console (frontend) ou terminal (backend)

---

Desenvolvido com ❤️ usando React, Fastify e Google Gemini
