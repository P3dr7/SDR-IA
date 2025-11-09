import { getPipeFields } from '../src/services/pipefy.service.js';

console.log('🔍 Analisando campos do Pipe no Pipefy...\n');

async function discoverFields() {
  const fieldMapping = await getPipeFields();
  
  if (!fieldMapping) {
    console.error('❌ Erro: Configure PIPEFY_API_TOKEN e PIPEFY_PIPE_ID no arquivo .env\n');
    console.log('📝 Para obter estas informações:');
    console.log('1. Token: https://app.pipefy.com/tokens');
    console.log('2. Pipe ID: Acesse seu pipe e copie o número da URL');
    console.log('   Exemplo: https://app.pipefy.com/pipes/123456 -> PIPE_ID = 123456\n');
    return;
  }

  console.log('✅ Campos mapeados automaticamente:\n');
  console.log('┌─────────────────────────┬──────────────────────────┐');
  console.log('│ Campo no Sistema        │ Field ID no Pipefy       │');
  console.log('├─────────────────────────┼──────────────────────────┤');
  
  const systemFields = [
    'nome',
    'email', 
    'empresa',
    'necessidade',
    'interesse_confirmado',
    'link_reuniao',
    'data_reuniao'
  ];

  systemFields.forEach(field => {
    const fieldId = fieldMapping[field];
    const status = fieldId ? '✓' : '✗';
    const displayId = fieldId ? fieldId.substring(0, 24) : 'NÃO ENCONTRADO';
    console.log(`│ ${status} ${field.padEnd(22)}│ ${displayId.padEnd(24)} │`);
  });
  
  console.log('└─────────────────────────┴──────────────────────────┘\n');

  // Campos encontrados
  const foundFields = systemFields.filter(f => fieldMapping[f]);
  const missingFields = systemFields.filter(f => !fieldMapping[f]);

  if (foundFields.length > 0) {
    console.log(`✅ ${foundFields.length}/${systemFields.length} campos encontrados e mapeados!\n`);
  }

  if (missingFields.length > 0) {
    console.log('⚠️  Campos não encontrados no seu Pipe:');
    missingFields.forEach(field => {
      console.log(`   - ${field}`);
    });
    console.log('\n💡 Dica: Certifique-se de criar campos com nomes similares no seu Pipe.');
    console.log('   Exemplos: "Nome", "E-mail", "Empresa", "Necessidade", etc.\n');
  }

  // Todos os campos disponíveis
  console.log('📋 Todos os campos do seu Pipe:\n');
  Object.entries(fieldMapping).forEach(([label, fieldId]) => {
    console.log(`   ${label.padEnd(30)} → ${fieldId}`);
  });

  console.log('\n🎯 Como funciona o mapeamento automático:');
  console.log('   - O sistema busca campos com nomes similares');
  console.log('   - Remove acentos e espaços para comparação');
  console.log('   - Exemplo: "Nome Completo" → "nome"');
  console.log('   - Exemplo: "E-mail do Lead" → "email"\n');
}

discoverFields();