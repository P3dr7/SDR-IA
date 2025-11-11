# Chat SDR Verzel - Frontend

Interface de chat responsiva e acessível para interação com o agente SDR automatizado.

## Funcionalidades

- ✅ **Mobile-first** - Design otimizado para dispositivos móveis
- ✅ **Acessibilidade** - Navegação completa por teclado (Tab, Enter, Esc)
- ✅ **Sessão Persistente** - ID anônimo com timeout configurável (30 min)
- ✅ **Persistência Local** - Histórico salvo no localStorage
- ✅ **Responsivo** - Adapta-se a mobile, tablet e desktop
- ✅ **Dark Mode** - Suporte automático ao tema do sistema
- ✅ **Loading States** - Indicadores visuais de carregamento
- ✅ **Tratamento de Erros** - Feedback claro de erros de conexão

## Instalação

```powershell
cd client/SDR-Front
npm install
```

## Configuração

Crie um arquivo `.env` na raiz do projeto (opcional):

```
VITE_API_URL=http://localhost:3000
```

Se não configurado, usa `http://localhost:3000` por padrão.

## Executar

```powershell
npm run dev
```

Acesse: http://localhost:5173

## Build para Produção

```powershell
npm run build
npm run preview
```

## Estrutura

```
src/
├─ components/
│  ├─ Chat.jsx          # Componente principal do chat
│  └─ Chat.css          # Estilos (mobile-first)
├─ utils/
│  ├─ session.js        # Gerenciamento de sessão
│  └─ api.js            # Cliente HTTP para backend
├─ App.jsx
├─ App.css
├─ main.jsx
└─ index.css
```

## Navegação por Teclado

- **Enter** - Envia mensagem
- **Esc** - Limpa campo de input
- **Tab** - Navega entre elementos
- **Shift+Enter** - Nova linha (futuro)

## Sessão

- ID anônimo gerado automaticamente
- Timeout padrão: 30 minutos (configurável em `src/utils/session.js`)
- Histórico de mensagens salvo no localStorage
- Botão "Nova Conversa" limpa sessão e histórico

## Integração Backend

O chat se conecta ao backend em `/api/chat`:

- Primeira mensagem cria nova conversa
- `conversation_id` retornado pelo backend
- Mensagens subsequentes usam mesmo `conversation_id`
- Sessão renovada a cada interação

## Customização

### Timeout da Sessão

Em `src/utils/session.js`:

```javascript
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos
```

### URL da API

Em `.env`:

```
VITE_API_URL=https://seu-backend.com
```

## Observações

- Usa React 19 com Vite
- Sem dependências externas além de React
- CSS puro (sem frameworks)
- Totalmente responsivo
- Compatível com leitores de tela

## 🚀 Deploy na Vercel

### Passo 1: Preparar o Projeto

```powershell
# Teste o build localmente
npm run build
npm run preview
```

### Passo 2: Deploy

1. Acesse https://vercel.com
2. Conecte seu repositório GitHub
3. Selecione o diretório `client/SDR-Front` como root
4. Configure a variável de ambiente:
   - `VITE_API_URL` = URL do seu backend (ex: `https://seu-backend.com`)

### Passo 3: Configurações na Vercel

A Vercel detectará automaticamente que é um projeto Vite. Confirme:

- **Framework Preset:** Vite
- **Root Directory:** `client/SDR-Front` (se monorepo)
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### Variáveis de Ambiente na Vercel

No painel da Vercel, em **Settings → Environment Variables**, adicione:

```
VITE_API_URL=https://seu-backend-url.com
```

**IMPORTANTE:** Sem `VITE_API_URL` configurado, o chat tentará conectar em `http://localhost:3000` (não funcionará em produção).

### Deploy Automático

Após configurar, todo push na branch `main` fará deploy automático.

### Testar Produção

1. Acesse a URL gerada pela Vercel (ex: `https://seu-app.vercel.app`)
2. Abra o DevTools Console para ver logs
3. Teste envio de mensagens
4. Verifique se está conectando ao backend correto

### Troubleshooting

**Erro de CORS:**

- Configure CORS no backend para aceitar a URL da Vercel
- No backend (server.js), adicione a origem da Vercel

**Chat não conecta:**

- Verifique se `VITE_API_URL` está configurado na Vercel
- Confirme que o backend está acessível publicamente
- Teste a URL do backend manualmente: `https://seu-backend.com/health`

**Build falha:**

- Verifique erros no log de build da Vercel
- Confirme que `npm run build` funciona localmente
- Verifique versão do Node (recomendado: 18+)

---

ISC License
