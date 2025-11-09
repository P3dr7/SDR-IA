# 🤖 SDR Agent Backend

Backend orquestrador para um agente SDR (Sales Development Representative) automatizado usando Google Gemini, Fastify e integrações com Pipefy e sistema de agenda.

## 📁 Estrutura do Projeto

```
sdr-agent-backend/
├── server.js                      # Servidor principal Fastify
├── package.json                   # Dependências e scripts
├── .env                          # Variáveis de ambiente (criar a partir do .env.example)
├── .env.example                  # Template das variáveis de ambiente
└── src/
    ├── routes/
    │   └── chat.js               # Rota principal e orquestração
    └── services/
        ├── gemini.service.js     # Configuração e integração com Gemini
        ├── pipefy.service.js     # Integração com Pipefy (CRM)
        └── agenda.service.js     # Integração com sistema de agenda
```

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

#### `buscarHorariosDisponiveis`
Busca horários disponíveis na agenda
- Retorna lista de slots disponíveis

#### `agendarReuniao`
Agenda uma reunião com o lead
- Cria evento na agenda
- Atualiza card no Pipefy com link da reunião

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

## 🧪 Testando

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

## 📚 Próximos Passos

1. ✅ Implementar integrações reais com Pipefy e Agenda
2. ✅ Adicionar persistência de conversas (Redis/Database)
3. ✅ Implementar autenticação de usuários
4. ✅ Adicionar testes automatizados
5. ✅ Implementar logging estruturado
6. ✅ Adicionar monitoramento e métricas
7. ✅ Deploy em produção (Railway, Render, AWS, etc.)

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Faça fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📄 Licença

ISC

---

**Desenvolvido para o desafio de Agente SDR Automatizado** 🚀