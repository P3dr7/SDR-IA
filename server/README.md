# 🤖 SDR Agent Backend

Backend orquestrador para um agente SDR (Sales Development Representative) automatizado usando Google Gemini, Fastify e integrações com Pipefy e sistema de agenda.

---

## 🚀 Como usar a aplicação do zero

### 1. Pré-requisitos

- Node.js (18+)
- npm
- (Opcional) Git

### 2. Clonando o repositório

```powershell
git clone <url-do-repositorio>
```

### 3. Configurando variáveis de ambiente

No diretório `server`, copie `.env.example` para `.env` e preencha os dados:

```powershell
Copy-Item .env.example .env
# Edite o arquivo .env conforme sua configuração
```

### 4. Instalando dependências

#### Backend (server)

```powershell
cd server
npm install
```

### 5. Iniciando a aplicação

#### Backend

```powershell
cd server
npm run dev
# ou, para produção
npm start
```

## 🔧 Configuração do Gemini

**Model:** `gemini-2.5-flash` (conforme `gemini.service.js`)

- Backend: http://localhost:3000

### 7. Observações

- Configure corretamente as credenciais de APIs externas no `.env`.

Em caso de dúvidas, consulte a documentação dos serviços utilizados ou abra uma issue no repositório.

Este backend funciona em modo "mock" quando integrações não estão configuradas. Para ativar integrações reais, configure as variáveis abaixo no arquivo `.env`.

Obrigatórias (sempre):

- PORT=3000
- PIPEFY_API_TOKEN=seu_token_do_pipefy
- PIPEFY_PIPE_ID=id_do_seu_pipe

Agendamento – escolha UMA das opções abaixo:

Opção A) Google Calendar via OAuth2

- USE_GOOGLE_CALENDAR=true
- GOOGLE_CLIENT_ID=...apps.googleusercontent.com
- GOOGLE_CLIENT_SECRET=...
- GOOGLE_CALENDAR_ID=primary ou seu_email@gmail.com

```powershell
node script/oauth-setup.js
```

Siga as instruções exibidas no terminal. No Google Cloud Console, cadastre o Redirect URI: http://localhost:3000/oauth2callback.

Opção B) Calendly (alternativa ao Google Calendar)

## ⚙️ Variáveis de Ambiente (.env)

O arquivo `.env.example` deve ser atualizado para refletir estas variáveis (ver próxima seção). O backend habilita MODO MOCK automaticamente quando credenciais não existem.

### Obrigatórias (núcleo)

```
PORT=3000
NODE_ENV=development
GEMINI_API_KEY=chave_gerada_no_Google_AI_Studio
```

### Pipefy (opcional)

```
PIPEFY_API_TOKEN=token_pipefy
PIPEFY_PIPE_ID=123456789
```

Sem essas variáveis o serviço `pipefy.service.js` funciona em mock (criação/atualização simulada e detecção de duplicata apenas para o e-mail "duplicado@email.com").

### Agendamento (escolha Google OU Calendly)

Ative qual usar com `USE_GOOGLE_CALENDAR=true` ou `false`.

Opção A) Google Calendar (OAuth2):

```
USE_GOOGLE_CALENDAR=true
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALENDAR_ID=primary
GOOGLE_REFRESH_TOKEN=gerado_pelo_script
```

Variáveis opcionais avançadas (caso use Service Account ou outro fluxo):

```
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
```

Gerar refresh token (OAuth):

```powershell
node script/oauth-setup.js
```

Siga instruções: configure o Redirect URI `http://localhost:3000/oauth2callback` no Google Cloud Console.

Opção B) Calendly:

```
USE_GOOGLE_CALENDAR=false
CALENDLY_API_TOKEN=token_calendly
CALENDLY_EVENT_TYPE_URI=https://api.calendly.com/event_types/XXXX
```

Descobrir event type:

```powershell
node script/discover-calendly.js
```

### Variáveis Não Usadas

Se encontrar `CALENDAR_API_KEY` ou `CALENDAR_ID` em versões antigas, REMOVA: não são referenciadas no código atual.

### Comportamento de Fallback

- Sem Pipefy: respostas simuladas, card_id mock.
- Sem agendamento: horários e criação de reunião mock.
- Sem Gemini: o servidor não consegue gerar respostas (endpoint `/api/chat` falhará).
- CALENDLY_EVENT_TYPE_URI=uri_do_event_type

Descubra o Event Type do Calendly:

```powershell
node script/discover-calendly.js
```

Observações:

- Se `PIPEFY_API_TOKEN` ou `PIPEFY_PIPE_ID` não estiverem setados, o serviço de Pipefy usa MOCKs.
- Se agendamento (Google/Calendly) não estiver configurado, horários e reuniões são gerados em MOCK.

## 📁 Estrutura do Projeto (backend)

```
server/
├─ server.js                      # Servidor Fastify (CORS, rotas, health, /test-calendar)
├─ package.json                   # Dependências e scripts npm
├─ .env                           # Variáveis de ambiente (não versionado)
├─ .env.example                   # Template das variáveis de ambiente
├─ README.md
├─ teste.html                     # Página HTML simples para testar o chat
├─ script/
│  ├─ oauth-setup.js             # Fluxo OAuth2 para gerar GOOGLE_REFRESH_TOKEN
│  ├─ discover-calendly.js       # Descobre usuário e Event Types do Calendly
│  └─ discover-pipefy-fields.js  # Lista/mapeia campos do seu Pipe
└─ src/
   ├─ routes/
   │  └─ chat.js                 # Endpoint /api/chat e gerenciamento de conversas
   └─ services/
     ├─ gemini.service.js       # Configuração do modelo Gemini e function calling
     ├─ agenda.service.js       # Slots e agendamento (Google Calendar/Calendly)
     ├─ google-calendar.service.js # Criação/lista/cancelamento de eventos e Meet
     └─ pipefy.service.js       # Busca/Cria/Atualiza cards no Pipefy
```

### O que tem em cada pasta/arquivo

- `server.js`: cria o servidor, registra CORS, rotas e health check; inclui rota de debug `/test-calendar`
- `src/routes/chat.js`: ciclo de orquestração com Gemini, chama funções registrarLead/buscarHorariosDisponiveis/agendarReuniao
- `src/services/gemini.service.js`: system instruction, tools e criação de sessão de chat (modelo `gemini-2.5-flash`)
- `src/services/agenda.service.js`: decide entre Google Calendar ou Calendly conforme `.env`; possui mocks de fallback
- `src/services/google-calendar.service.js`: integra com Google Calendar (OAuth2), cria evento com Google Meet e atualiza Pipefy
- `src/services/pipefy.service.js`: carrega campos do pipe, evita duplicatas por email, cria/atualiza card e grava link/data da reunião
- `script/oauth-setup.js`: guia interativo para gerar `GOOGLE_REFRESH_TOKEN`
- `script/discover-calendly.js`: ajuda a obter `CALENDLY_EVENT_TYPE_URI`
- `script/discover-pipefy-fields.js`: mapeia campos do Pipefy e sugere ajustes
- `teste.html`: cliente HTML básico para testar o endpoint `/api/chat`

## 🚀 Instalação

1. **Clone o repositório**

```bash
git clone <seu-repositorio>
cd sdr-agent-backend
```

2. **Instale as dependências**

```bash
npm install
```

3. **Configure as variáveis de ambiente**

```bash
cp .env.example .env
```

Edite o arquivo `.env` e adicione sua chave da API do Gemini:

```
GEMINI_API_KEY=sua_api_key_aqui
```

Para obter uma chave da API do Gemini, acesse: https://aistudio.google.com/apikey

4. **Inicie o servidor**

```bash
# Modo desenvolvimento (com auto-reload)
npm run dev

# Modo produção
npm start
```

O servidor estará rodando em `http://localhost:3000`

## 📡 API Endpoints

### Visão Geral Rápida

| Método | Rota                         | Descrição                                                                      |
| ------ | ---------------------------- | ------------------------------------------------------------------------------ |
| POST   | `/api/chat`                  | Envia mensagem do usuário e recebe resposta do agente (pode acionar functions) |
| DELETE | `/api/chat/:conversation_id` | Remove conversa da memória                                                     |
| GET    | `/api/conversations`         | Lista conversas ativas (debug)                                                 |
| GET    | `/health`                    | Health check simples                                                           |
| GET    | `/test-calendar`             | Executa testes de criação de eventos (debug Google Calendar)                   |

### Convenções

- `conversation_id`: UUID gerado pelo backend na primeira mensagem se não fornecido.
- Histórico é mantido em memória (não persiste entre reinícios de processo).
- Respostas de erro seguem formato: `{ "error": "Descrição", "details?": "mensagem interna" }`.

### `POST /api/chat`

Endpoint principal para conversação com o agente SDR.

**Request Body:**

```json
{
	"message": "Olá, tenho interesse em conhecer a Verzel",
	"conversation_id": "uuid-opcional"
}
```

**Response:**

```json
{
	"conversation_id": "uuid-da-conversa",
	"message": "Resposta do agente SDR",
	"timestamp": "2025-11-07T10:30:00.000Z"
}
```

### `GET /api/conversations`

Lista todas as conversas ativas (útil para debug).

**Response:**

```json
{
	"total": 3,
	"conversation_ids": ["uuid1", "uuid2", "uuid3"]
}
```

### `DELETE /api/chat/:conversation_id`

Remove uma conversa específica do armazenamento.

**Response:**

```json
{
	"message": "Conversa removida com sucesso"
}
```

### `GET /health`

Health check do servidor.

**Response:**

```json
{
	"status": "ok",
	"timestamp": "2025-11-07T10:30:00.000Z"
}
```

## 🧠 Como Funciona

### 1. Gerenciamento de Estado

- O backend mantém o histórico de conversas em memória usando um `Map`
- Cada conversa é identificada por um `conversation_id` único (UUID)
- O histórico completo é enviado para o Gemini a cada interação (stateless API)

### 2. Orquestração com Function Calling

O agente SDR segue este fluxo:

```
1. Usuário envia mensagem
   ↓
2. Backend recupera histórico da conversa
   ↓
3. Envia mensagem + histórico para Gemini
   ↓
4. Gemini responde (texto OU chamada de função)
   ↓
5. Se for FUNÇÃO:
   - Backend executa a função (Pipefy/Agenda)
   - Envia resultado de volta para Gemini
   - Gemini gera resposta final
   ↓
6. Se for TEXTO:
   - Retorna resposta para o usuário
```

### 3. Funções Disponíveis

O agente SDR tem acesso a 3 ferramentas:

#### `registrarLead`

Registra ou atualiza um lead no CRM (Pipefy)

- Verifica duplicatas por e-mail
- Cria novo card ou atualiza existente

Argumentos:

```json
{
   "nome": "string",
   "email": "string",
   "empresa": "string | opcional",
   "necessidade": "string",
   "interesse_confirmado": true | false
}
```

Regra: `interesse_confirmado` só vira `true` após confirmação explícita do lead.

#### `buscarHorariosDisponiveis`

Busca horários disponíveis na agenda

- Retorna lista de slots disponíveis

Retorno (exemplo):

```json
{
	"success": true,
	"slots": [
		{ "date": "2025-11-11", "time": "10:00", "display": "11/11/2025 às 10:00" }
	],
	"total": 3
}
```

#### `agendarReuniao`

Agenda uma reunião com o lead

- Cria evento na agenda
- Atualiza card no Pipefy com link da reunião

Argumentos:

```json
{
	"data": "YYYY-MM-DD",
	"hora": "HH:MM",
	"nome": "string",
	"email": "string"
}
```

Após executar, o backend complementa com Pipefy (se configurado) e Google Calendar/Calendly.

## 🔧 Configuração do Gemini

O modelo é configurado com:

- **Model:** `gemini-1.5-pro-latest`
- **System Instruction:** Prompt definindo comportamento do SDR
- **Tools:** 3 funções para registro e agendamento
- **Temperature:** 0.7 (equilibra criatividade e consistência)

## 🎯 Fluxo de Conversa

1. **Introdução:** SDR se apresenta e inicia conversa
2. **Descoberta:** Coleta nome, e-mail, empresa e necessidade
3. **Qualificação:** Confirma interesse em seguir com reunião
4. **Registro:** Usa `registrarLead` para salvar no CRM
5. **Agendamento:** Usa `buscarHorariosDisponiveis` e `agendarReuniao`
6. **Confirmação:** Confirma reunião agendada e fornece detalhes

## 📝 Notas de Implementação

### Mock vs Produção

Os serviços `pipefy.service.js` e `agenda.service.js` atualmente usam **dados mockados**:

- **Pipefy:** Simula criação/atualização de cards. E-mails com `duplicado@email.com` são tratados como duplicatas.
- **Agenda:** Gera 3 horários disponíveis para amanhã (10h, 14h, 16h).

Para produção, você deve:

1. **Pipefy:**

   - Implementar queries/mutations GraphQL reais
   - Usar `PIPEFY_API_TOKEN` e `PIPEFY_PIPE_ID` do `.env`
   - Documentação: https://developers.pipefy.com/

2. **Agenda:**
   - Integrar com sua ferramenta de calendário (Google Calendar, Calendly, etc.)
   - Implementar autenticação OAuth se necessário
   - Ajustar formatação de datas conforme API

### Prevenção de Duplicatas

A função `createOrUpdateCard` no Pipefy Service implementa lógica crucial:

```javascript
// 1. Buscar card existente por e-mail
const existingCard = await findCardByEmail(email);

// 2. Se existe: atualizar
if (existingCard) {
	return updateCard(existingCard.id, data);
}

// 3. Se não existe: criar novo
return createCard(data);
```

## � Serviços

| Serviço         | Arquivo                                   | Função Principal                                                      |
| --------------- | ----------------------------------------- | --------------------------------------------------------------------- |
| Gemini          | `src/services/gemini.service.js`          | Cria sessões e define system instruction e function declarations      |
| Pipefy          | `src/services/pipefy.service.js`          | Busca card por e-mail, cria/atualiza cards, atualiza card com reunião |
| Agenda          | `src/services/agenda.service.js`          | Gera/obtém slots e agenda reuniões (Google Calendar ou Calendly)      |
| Google Calendar | `src/services/google-calendar.service.js` | Cria eventos com Meet, lista/cancela eventos                          |

### Modo Mock

Se variáveis críticas estiverem ausentes, cada serviço declara mensagens de log e retorna objetos simulados para permitir desenvolvimento sem bloquear fluxo.

## 🛠 Scripts Utilitários

| Script             | Comando                                 | Objetivo                                           |
| ------------------ | --------------------------------------- | -------------------------------------------------- |
| OAuth Google       | `node script/oauth-setup.js`            | Gera `GOOGLE_REFRESH_TOKEN` via fluxo OAuth2 local |
| Descobrir Calendly | `node script/discover-calendly.js`      | Lista usuário e sugere `CALENDLY_EVENT_TYPE_URI`   |
| Descobrir Pipefy   | `node script/discover-pipefy-fields.js` | Mapeia campos do pipe e mostra IDs                 |

## ❗ Formato de Erros

Erros do backend seguem padrão:

```json
{ "error": "Mensagem resumida", "details": "Opcional - detalhe técnico" }
```

Exemplos: `400` (entrada inválida), `404` (conversa não encontrada), `500` (falha interna ou integração).

## 🔍 Troubleshooting

| Problema                | Causa Comum                               | Solução                                                                         |
| ----------------------- | ----------------------------------------- | ------------------------------------------------------------------------------- |
| Resposta sempre igual   | Falta de histórico ou model config errado | Verifique `createChatSession()` e se `conversation_id` está sendo reaproveitado |
| Horários sempre mock    | Falta de credenciais (Google/Calendly)    | Configure `.env` e reinicie servidor                                            |
| Pipefy não atualiza     | Campos não mapeados ou token inválido     | Rode `discover-pipefy-fields.js` e valide `PIPEFY_API_TOKEN`                    |
| Erro OAuth Google       | Redirect URI incorreto                    | Confirme `http://localhost:3000/oauth2callback` no Console Cloud                |
| Sem link do Meet        | Escopo insuficiente ou API não habilitada | Habilite Calendar API e inclua escopos no OAuth                                 |
| Duplicata não detectada | Campo `email` não encontrado no pipe      | Crie campo 'Email' no Pipefy start form                                         |

## 🧪 Testes Rápidos (PowerShell)

```powershell
curl -Method POST -Uri http://localhost:3000/api/chat -Headers @{"Content-Type"="application/json"} -Body '{"message":"Olá"}'
```

```powershell
$cid = (curl -Method POST -Uri http://localhost:3000/api/chat -Headers @{"Content-Type"="application/json"} -Body '{"message":"Olá"}' | ConvertFrom-Json).conversation_id
curl -Method POST -Uri http://localhost:3000/api/chat -Headers @{"Content-Type"="application/json"} -Body '{"message":"Meu nome é Ana","conversation_id":"'+$cid+'"}'
```

## 🛣 Roadmap Ajustado

1. Persistência (Redis ou Postgres) para conversas
2. Auth (JWT) para proteger endpoints
3. Observabilidade (pino + OpenTelemetry)
4. Rate limiting (Fastify plugin) e proteção contra abuse
5. Testes automatizados (Vitest ou Jest)
6. Deploy containerizado (Dockerfile + CI)
7. Webhook Pipefy para sync de atualizações externas
8. Cache de slots de agenda (reduzir chamadas externas)

## ✅ Checklist Prod Ready

- [ ] Variáveis `.env` preenchidas
- [ ] Pipefy campos criados
- [ ] Google Calendar API habilitada
- [ ] OAuth2 configurado (Refresh Token válido)
- [ ] Logs estruturados
- [ ] Estratégia de persistência definida
- [ ] Testes básicos de regressão

## �🧪 Testando

### Teste 1: Nova Conversa

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Olá!"}'
```

### Teste 2: Continuando Conversa

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Meu nome é João Silva",
    "conversation_id": "uuid-retornado-anteriormente"
  }'
```

### Teste 3: Testando Duplicata

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Meu email é duplicado@email.com",
    "conversation_id": "uuid-da-conversa"
  }'
```

## 🔐 Segurança

- **API Keys:** Nunca commite o arquivo `.env` com suas chaves
- **Rate Limiting:** Considere adicionar rate limiting para produção
- **Validação:** Adicione validação de entrada mais robusta
- **CORS:** Configure CORS adequadamente para seu frontend

## 🚢 Deploy na Vercel

O backend está configurado para deploy como **Vercel Serverless Functions**. Para instruções detalhadas, consulte [DEPLOY.md](./DEPLOY.md).

### Resumo Rápido

1. **Instalar Vercel CLI**:

   ```powershell
   npm install -g vercel
   ```

2. **Fazer Deploy**:

   ```powershell
   vercel
   ```

3. **Configurar Variáveis de Ambiente** (obrigatório):

   - `GEMINI_API_KEY` - **Obrigatória** para funcionamento
   - `CORS_ORIGIN` - URLs do frontend separadas por vírgula (ex: `https://seu-frontend.vercel.app,http://localhost:5173`)
   - `PIPEFY_API_TOKEN`, `PIPEFY_PIPE_ID` - Opcionais (usa mock se ausentes)
   - `USE_GOOGLE_CALENDAR`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, etc. - Opcionais
   - `CALENDLY_API_TOKEN`, `CALENDLY_EVENT_TYPE_URI` - Opcionais

4. **Importante**:
   - Configure `CORS_ORIGIN` com a URL do seu frontend em produção
   - Todas as rotas `/api/*`, `/health` e `/test-calendar` são automaticamente mapeadas
   - Logs disponíveis no dashboard da Vercel
   - Timeouts padrão: 10s (Hobby), 60s (Pro)

Para troubleshooting de CORS, mocks e timeouts, veja [DEPLOY.md](./DEPLOY.md).

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Faça fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📄 Licença

ISC
