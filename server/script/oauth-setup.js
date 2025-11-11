import { google } from 'googleapis';
import http from 'http';
import { URL } from 'url';
import open from 'open';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Bloco para resolver o caminho corretamente em ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// Verificar credenciais
console.log('\n🔍 VERIFICANDO CONFIGURAÇÃO\n');
console.log('CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅' : '❌ FALTANDO');
console.log('CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅' : '❌ FALTANDO');

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('\n❌ Credenciais não encontradas no .env\n');
  process.exit(1);
}

// Mostrar os primeiros caracteres (debug)
console.log('\nClient ID (início):', process.env.GOOGLE_CLIENT_ID.substring(0, 20) + '...');
console.log('Client ID (fim):', '...' + process.env.GOOGLE_CLIENT_ID.slice(-30));

const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  REDIRECT_URI  // URI diferente para evitar conflitos
);

const scopes = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent'
});

console.log('\n📋 URL de autorização gerada:');
console.log(authUrl);
console.log('\n⚠️  ANTES DE CONTINUAR:\n');
console.log('1. Acesse: https://console.cloud.google.com/apis/credentials');
console.log('2. Clique no seu OAuth 2.0 Client ID');
console.log('3. Em "URIs de redirecionamento autorizados", adicione:');
console.log(`   ${REDIRECT_URI}`);
console.log('4. Clique em SALVAR');
console.log('5. Aguarde 1-2 minutos para a mudança propagar\n');
console.log('Pressione ENTER quando estiver pronto...');

// Aguardar usuário confirmar
process.stdin.once('data', () => {
  console.log('\n🌐 Abrindo navegador...\n');
  
  const server = http.createServer(async (req, res) => {
    if (req.url.startsWith('/oauth2callback')) {
      const url = new URL(req.url, 'http://localhost:3000');
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        console.error('\n❌ Erro na autorização:', error);
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>❌ Erro: ${error}</h1><p>Volte ao terminal para mais detalhes.</p>`);
        server.close();
        process.exit(1);
        return;
      }

      if (code) {
        try {
          console.log('🔄 Trocando código por tokens...');
          const { tokens } = await oauth2Client.getToken(code);
          
          console.log('\n✅ SUCESSO!\n');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('📝 Adicione esta linha no seu .env:');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('\n✅ Configuração completa!\n');

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <html>
              <head>
                <title>Autorização Concluída</title>
                <style>
                  body { font-family: Arial; padding: 40px; text-align: center; }
                  h1 { color: #4CAF50; }
                </style>
              </head>
              <body>
                <h1>✅ Autorização Concluída!</h1>
                <p>Volte ao terminal e copie o GOOGLE_REFRESH_TOKEN.</p>
                <p>Você pode fechar esta página.</p>
              </body>
            </html>
          `);
          
          setTimeout(() => {
            server.close();
            process.exit(0);
          }, 2000);
        } catch (error) {
          console.error('\n❌ Erro ao obter tokens:', error.message);
          res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>❌ Erro ao processar autorização</h1>');
          server.close();
          process.exit(1);
        }
      }
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.listen(3000, () => {
    console.log('🌐 Servidor OAuth iniciado em http://localhost:3000');
    console.log('🔐 Abrindo página de autorização...\n');
    open(authUrl);
  });
});

// ============================================
// GUIA COMPLETO DE CONFIGURAÇÃO
// ============================================

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║   GUIA: Como configurar OAuth2 no Google Cloud        ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📍 PASSO 1: Acesse o Google Cloud Console');
console.log('   https://console.cloud.google.com/apis/credentials\n');

console.log('📍 PASSO 2: Configurar OAuth consent screen (se ainda não fez)');
console.log('   1. Clique em "OAuth consent screen" no menu lateral');
console.log('   2. User Type: Externo');
console.log('   3. Preencha:');
console.log('      - App name: SDR Agent Calendar');
console.log('      - User support email: seu-email@exemplo.com');
console.log('      - Developer contact: seu-email@exemplo.com');
console.log('   4. Clique em SALVAR E CONTINUAR');
console.log('   5. Em "Scopes", clique em SALVAR E CONTINUAR (sem adicionar)');
console.log('   6. Em "Test users", adicione seu email pessoal');
console.log('   7. Clique em SALVAR E CONTINUAR\n');

console.log('📍 PASSO 3: Criar OAuth 2.0 Client ID (se ainda não criou)');
console.log('   1. Volte para "Credentials"');
console.log('   2. Clique em "+ CRIAR CREDENCIAIS"');
console.log('   3. Selecione "ID do cliente OAuth 2.0"');
console.log('   4. Tipo de aplicativo: "Aplicativo da Web"');
console.log('   5. Nome: "SDR Agent Calendar"');
console.log('   6. URIs de redirecionamento autorizados:');
console.log('      http://localhost:3000/oauth2callback');
console.log('   7. Clique em CRIAR');
console.log('   8. Copie o Client ID e Client Secret para o .env\n');

console.log('📍 PASSO 4: Habilitar APIs necessárias');
console.log('   1. Acesse: https://console.cloud.google.com/apis/library');
console.log('   2. Busque e habilite: "Google Calendar API"');
console.log('   3. Clique em "ATIVAR"\n');

console.log('📍 PASSO 5: Seu .env deve ter:');
console.log('   GOOGLE_CLIENT_ID=123456-abc.apps.googleusercontent.com');
console.log('   GOOGLE_CLIENT_SECRET=GOCSPX-abc123');
console.log('   GOOGLE_CALENDAR_ID=seu-email@gmail.com ou primary');
console.log('   USE_GOOGLE_CALENDAR=true\n');

console.log('═══════════════════════════════════════════════════════\n');