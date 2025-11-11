# Deploy na Vercel - Guia Rápido

## 📋 Checklist Pré-Deploy

- [ ] Testei `npm run build` localmente sem erros
- [ ] Testei `npm run preview` e o app funciona
- [ ] Tenho a URL do backend em produção
- [ ] Backend permite CORS da URL da Vercel

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
client/SDR-Front
```

Se já estiver na pasta raiz do projeto, deixe em branco.

**Framework:** Vite (detectado automaticamente)

**Build Command:**

```
npm run build
```

**Output Directory:**

```
dist
```

**Install Command:**

```
npm install
```

### 4. Variáveis de Ambiente

Antes de fazer deploy, clique em **"Environment Variables"**:

**Name:** `VITE_API_URL`
**Value:** URL do seu backend (ex: `https://seu-backend.railway.app` ou `https://seu-backend.render.com`)

**IMPORTANTE:** Deve ser a URL COMPLETA do backend (incluindo `https://`)

### 5. Deploy

Clique em **"Deploy"**

Aguarde o build (1-2 minutos)

### 6. Testar

Acesse a URL gerada (ex: `https://seu-app.vercel.app`)

Teste:

- ✅ Chat abre corretamente
- ✅ Mensagem é enviada
- ✅ Resposta do agente chega
- ✅ Funciona em mobile

## 🔧 Configurar CORS no Backend

No seu backend (`server/server.js`), adicione a URL da Vercel:

```javascript
await fastify.register(cors, {
	origin: [
		"http://localhost:5173",
		"https://seu-app.vercel.app", // Adicione esta linha
	],
});
```

Ou, para aceitar qualquer origem (desenvolvimento):

```javascript
await fastify.register(cors, {
	origin: true,
});
```

## 🐛 Troubleshooting

### Build falha na Vercel

**Erro:** `Cannot find module`

- Verifique se todas as dependências estão em `package.json`
- Rode `npm install` localmente
- Commit e push novamente

**Erro:** `Build exceeded maximum duration`

- Projeto muito grande? Verifique `node_modules`
- Limpe cache da Vercel em Settings

### Chat não conecta ao backend

1. Abra DevTools (F12) → Console
2. Procure por erros de CORS ou network
3. Verifique:
   - `VITE_API_URL` está correto?
   - Backend está online? Teste: `https://seu-backend.com/health`
   - Backend permite CORS da URL da Vercel?

### Mensagens não aparecem

- Limpe localStorage: DevTools → Application → Local Storage → Clear
- Recarregue a página (Ctrl+Shift+R)

## 🔄 Redeploy Automático

Após configurar, todo `git push` na branch `main` fará deploy automático.

Para desabilitar:

- Settings → Git → Ignored Build Step

## 📊 Monitoramento

- **Analytics:** Settings → Analytics
- **Logs:** Deployment → View Function Logs
- **Performance:** Speed Insights (ativar em Settings)

## 🌍 Domínio Customizado

Settings → Domains → Add Domain

Ex: `chat.seusite.com.br`

---

Pronto para produção! 🎉
