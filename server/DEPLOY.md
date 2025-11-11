# Deploy Backend na Vercel - Guia Completo

## 📋 Checklist Pré-Deploy

- [ ] Tenho a API Key do Gemini
- [ ] Testei o servidor localmente (`npm run dev`)
- [ ] Configurei as credenciais (Pipefy, Google Calendar ou Calendly) - opcional
- [ ] Tenho a URL do frontend (para configurar CORS)

## 🚀 Passos para Deploy

### 1. Acesse a Vercel

https://vercel.com

Faça login com GitHub

### 2. Novo Projeto

- Clique em **"Add New..."** → **"Project"**
- Selecione seu repositório `SDR-IA`
- Clique em **"Import"**

### 3. Configurar Build

Se o repositório for monorepo (tem `client/` e `server/`):

**Root Directory:**

```
server
```

**Framework Preset:** Other

**Build Command:**

```
# Deixe em branco (não precisa de build)
```

**Output Directory:**

```
# Deixe em branco
```

**Install Command:**

```
npm install
```

### 4. Variáveis de Ambiente (OBRIGATÓRIAS)

Clique em **"Environment Variables"** e adicione:

#### Obrigatórias:

**Name:** `GEMINI_API_KEY`
**Value:** Sua chave do Gemini (https://aistudio.google.com/apikey)

**Name:** `CORS_ORIGIN`
**Value:** URL do seu frontend (ex: `https://seu-frontend.vercel.app`)

**Name:** `NODE_ENV`
**Value:** `production`

#### Opcionais (Pipefy):

**Name:** `PIPEFY_API_TOKEN`
**Value:** Token do Pipefy

**Name:** `PIPEFY_PIPE_ID`
**Value:** ID do Pipe

#### Opcionais (Google Calendar):

**Name:** `USE_GOOGLE_CALENDAR`
**Value:** `true`

**Name:** `GOOGLE_CLIENT_ID`
**Value:** Client ID do Google Cloud

**Name:** `GOOGLE_CLIENT_SECRET`
**Value:** Client Secret do Google Cloud

**Name:** `GOOGLE_CALENDAR_ID`
**Value:** `primary` ou email do calendário

**Name:** `GOOGLE_REFRESH_TOKEN`
**Value:** Token gerado com `node script/oauth-setup.js`

#### Opcionais (Calendly):

**Name:** `USE_GOOGLE_CALENDAR`
**Value:** `false`

**Name:** `CALENDLY_API_TOKEN`
**Value:** Token do Calendly

**Name:** `CALENDLY_EVENT_TYPE_URI`
**Value:** URI do Event Type

### 5. Deploy

Clique em **"Deploy"**

Aguarde o deploy (1-2 minutos)

### 6. Obter URL do Backend

Após o deploy, você terá uma URL como:

```
https://seu-backend.vercel.app
```

**Copie esta URL!** Você precisará dela para configurar o frontend.

### 7. Testar Backend

Teste os endpoints:

```powershell
# Health check
curl https://seu-backend.vercel.app/health

# Teste de chat
curl -X POST https://seu-backend.vercel.app/api/chat -H "Content-Type: application/json" -d '{"message":"Olá"}'
```

## 🔄 Configurar Frontend

Agora que o backend está no ar, atualize o frontend:

1. Vá no projeto do **frontend** na Vercel
2. Settings → Environment Variables
3. Adicione/Atualize:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://seu-backend.vercel.app` (URL do backend que você acabou de fazer deploy)
4. Clique em **"Redeploy"** para aplicar

## 🔧 Configurar CORS

O backend já está configurado para aceitar CORS da variável `CORS_ORIGIN`.

Se precisar adicionar mais URLs (ex: localhost para testes):

```
CORS_ORIGIN=https://seu-frontend.vercel.app,http://localhost:5173
```

## 🐛 Troubleshooting

### Backend não inicia

**Erro:** `Application error`

- Verifique os logs: Deployment → View Function Logs
- Confirme que `GEMINI_API_KEY` está configurado
- Teste localmente: `npm run dev`

### CORS bloqueado

**Erro:** `CORS policy: No 'Access-Control-Allow-Origin'`

- Verifique se `CORS_ORIGIN` contém a URL do frontend
- Formato: `https://seu-frontend.vercel.app` (sem barra no final)
- Múltiplas URLs: separe com vírgula

### Timeout / 504

**Causa:** Função serverless excedeu 10 segundos

- Gemini está demorando?
- Google Calendar/Pipefy lentos?
- Considere aumentar timeout (Vercel Pro) ou otimizar código

### Gemini não responde

- Confirme que `GEMINI_API_KEY` está correta
- Teste a key: https://aistudio.google.com/apikey
- Verifique quotas da API

### Pipefy/Calendar em modo MOCK

**Normal!** Se não configurou as variáveis, o backend usa dados mockados.

Para produção real, configure:

- Pipefy: `PIPEFY_API_TOKEN` e `PIPEFY_PIPE_ID`
- Google Calendar: todas as variáveis `GOOGLE_*`

## 📊 Monitoramento

- **Logs:** Deployments → View Function Logs
- **Analytics:** Settings → Analytics
- **Erro 500?** Veja os logs para detalhes

## 🔐 Segurança

- ✅ Nunca comite `.env` com valores reais
- ✅ Use variáveis de ambiente na Vercel
- ✅ Configure CORS corretamente (não use `origin: true` em produção)
- ✅ Proteja endpoints sensíveis (adicione autenticação se necessário)

## 🌍 Domínio Customizado

Settings → Domains → Add Domain

Ex: `api.seusite.com.br`

Atualize `CORS_ORIGIN` e `VITE_API_URL` com o novo domínio.

## 🔄 Redeploy

Após atualizar variáveis de ambiente:

Deployments → ⋮ → Redeploy

Ou, todo `git push` na branch `main` faz redeploy automático.

## 📝 Checklist Final

- ✅ Backend deployado na Vercel
- ✅ `GEMINI_API_KEY` configurado
- ✅ `CORS_ORIGIN` com URL do frontend
- ✅ Health check funcionando: `/health`
- ✅ Chat funcionando: `POST /api/chat`
- ✅ Frontend configurado com `VITE_API_URL`
- ✅ Frontend e backend se comunicando
- ✅ CORS funcionando (sem erros no console)

---

Backend pronto para produção! 🎉

**URLs importantes:**

- Backend: `https://seu-backend.vercel.app`
- Frontend: `https://seu-frontend.vercel.app`
- Health: `https://seu-backend.vercel.app/health`
- API: `https://seu-backend.vercel.app/api/chat`
