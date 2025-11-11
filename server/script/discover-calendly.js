import dotenv from 'dotenv';
import { getCalendlyUser, getEventTypes } from '../src/services/agenda.service.js';

dotenv.config();

console.log('🔍 Descobrindo configuração do Calendly...\n');

async function discoverCalendly() {
  const CALENDLY_API_TOKEN = process.env.CALENDLY_API_TOKEN;

  if (!CALENDLY_API_TOKEN) {
    console.error('❌ ERRO: CALENDLY_API_TOKEN não configurado no .env\n');
    console.log('📝 Para obter o token:');
    console.log('1. Acesse: https://calendly.com/integrations/api_webhooks');
    console.log('2. Clique em "Get a token"');
    console.log('3. Gere um Personal Access Token');
    console.log('4. Copie o token');
    console.log('5. Cole no .env: CALENDLY_API_TOKEN=seu_token_aqui\n');
    return;
  }

  try {
    // Teste 1: Buscar informações do usuário
    console.log('📡 Buscando informações do usuário...\n');
    const user = await getCalendlyUser();
    
    console.log('✅ Usuário conectado:');
    console.log(`   Nome: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   URI: ${user.uri}\n`);

    // Teste 2: Listar Event Types
    console.log('📡 Buscando Event Types disponíveis...\n');
    const eventTypes = await getEventTypes();

    if (eventTypes.length === 0) {
      console.log('⚠️  Nenhum Event Type encontrado.');
      console.log('   Crie um Event Type no Calendly primeiro:\n');
      console.log('   https://calendly.com/event_types/user/me\n');
      return;
    }

    console.log(`✅ ${eventTypes.length} Event Type(s) encontrado(s):\n`);
    
    eventTypes.forEach((eventType, index) => {
      console.log(`${index + 1}. ${eventType.name}`);
      console.log(`   Duração: ${eventType.duration} minutos`);
      console.log(`   Tipo: ${eventType.kind}`);
      console.log(`   URI: ${eventType.uri}`);
      console.log(`   Link de agendamento: ${eventType.scheduling_url}\n`);
    });

    // Sugerir configuração
    console.log('📋 Configuração sugerida para o .env:\n');
    const suggestedEventType = eventTypes[0];
    console.log(`CALENDLY_EVENT_TYPE_URI=${suggestedEventType.uri}`);
    console.log('\n💡 Copie a linha acima e cole no seu arquivo .env\n');

    // Testar disponibilidade
    console.log('📅 Testando busca de horários disponíveis...');
    console.log('   (Isso pode levar alguns segundos...)\n');

    // Não vamos testar aqui porque precisa do EVENT_TYPE_URI configurado
    console.log('⚠️  Para testar horários, configure primeiro o CALENDLY_EVENT_TYPE_URI');
    console.log('   e execute o servidor: npm run dev\n');

  } catch (error) {
    console.error('❌ Erro ao conectar com Calendly:', error.message);
    console.log('\n💡 Verifique:');
    console.log('1. Se o token está correto');
    console.log('2. Se o token não expirou');
    console.log('3. Se você tem acesso à API do Calendly\n');
  }
}

discoverCalendly();