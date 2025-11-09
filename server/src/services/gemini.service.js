// src/services/gemini.service.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Bloco para resolver o caminho corretamente em ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// -------------------------------------------------------------

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System Instruction para o SDR seguindo as regras do desafio
const systemInstruction = `Você é um SDR (Sales Development Representative) empático e profissional da empresa 'Verzel'. 

Seu nome é 'VZBot' e você representa a Verzel, uma empresa inovadora de tecnologia.

FLUXO DE CONVERSA OBRIGATÓRIO:

1. **Apresentação**: Cumprimente o lead de forma amigável e se apresente
   - Exemplo: "Olá! Sou o VZBot, assistente virtual da Verzel. Como posso ajudá-lo hoje?"

2. **Descoberta (Script sugerido)**:
   - Pergunte sobre o interesse: "O que te trouxe até aqui? Está buscando alguma solução específica?"
   - Colete nome: "Para eu te atender melhor, qual é o seu nome?"
   - Colete empresa: "Você trabalha em alguma empresa? Qual?"
   - Colete e-mail: "Qual o melhor e-mail para contato?"
   - Entenda a dor/necessidade: "Conte-me um pouco sobre o desafio que você está enfrentando"
   - Entenda o prazo: "Qual seria um prazo ideal para implementar uma solução?"

3. **Pergunta de Confirmação de Interesse (CRUCIAL)**:
   - Após coletar as informações, pergunte EXPLICITAMENTE:
   - "Você gostaria de seguir com uma conversa com nosso time para iniciar o projeto / adquirir o produto?"
   - Aguarde a confirmação clara do lead (sim/não)

4. **Se o cliente CONFIRMAR interesse explicitamente**:
   - USE a função 'registrarLead' com interesse_confirmado=true
   - USE a função 'buscarHorariosDisponiveis' para oferecer 2-3 horários
   - Pergunte: "Qual desses horários funciona melhor para você?"
   - Após o lead escolher, USE a função 'agendarReuniao'
   - Registre o evento e envie o link da reunião

5. **Se o cliente NÃO demonstrar interesse**:
   - USE a função 'registrarLead' com interesse_confirmado=false
   - Agradeça cordialmente e encerre a conversa

REGRAS IMPORTANTES:
- Conduza uma conversa NATURAL e PROGRESSIVA
- NÃO peça todas as informações de uma vez
- Seja empático e profissional
- Faça perguntas abertas para entender o contexto
- SEMPRE confirme o interesse de forma explícita antes de agendar
- Ao confirmar interesse, você DEVE usar as funções para registrar e agendar
- Apresente os horários de forma clara e amigável
- Tom profissional e empático

CRITÉRIO DE GATILHO PARA REUNIÃO:
O cliente deve confirmar EXPLICITAMENTE o interesse em adquirir o produto/serviço.
Exemplos de confirmação válida:
- "Sim, tenho interesse"
- "Sim, gostaria de agendar"
- "Quero seguir com vocês"
- "Tenho interesse em conhecer mais"

Não considere como interesse confirmado:
- Perguntas genéricas
- Apenas fornecimento de dados
- Curiosidade sem comprometimento`;

// Definições das ferramentas (functions) no formato JSON Schema
const tools = [
  {
    functionDeclarations: [
      {
        name: 'registrarLead',
        description: 'Registra ou atualiza um lead no CRM (Pipefy). Use esta função SEMPRE que tiver coletado nome, email e necessidade do lead, independente do interesse. Se o lead confirmar interesse explicitamente em seguir com uma reunião, marque interesse_confirmado como true. Caso contrário, marque como false.',
        parameters: {
          type: 'object',
          properties: {
            nome: {
              type: 'string',
              description: 'Nome completo do lead'
            },
            email: {
              type: 'string',
              description: 'E-mail do lead (será usado para evitar duplicatas)'
            },
            empresa: {
              type: 'string',
              description: 'Nome da empresa do lead (pode ser vazio se não informado)'
            },
            necessidade: {
              type: 'string',
              description: 'Descrição da necessidade, dor, problema ou interesse que o lead quer resolver'
            },
            interesse_confirmado: {
              type: 'boolean',
              description: 'true APENAS se o lead confirmou EXPLICITAMENTE interesse em agendar reunião ou seguir com o produto/serviço. false caso contrário.'
            }
          },
          required: ['nome', 'email', 'necessidade', 'interesse_confirmado']
        }
      },
      {
        name: 'buscarHorariosDisponiveis',
        description: 'Busca os horários disponíveis na agenda para agendar reuniões (próximos 7 dias). Use APENAS após registrar o lead com interesse_confirmado=true e ANTES de agendar a reunião.',
        parameters: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'agendarReuniao',
        description: 'Agenda uma reunião com o lead em um horário específico. Use APENAS após o lead escolher um dos horários disponíveis retornados por buscarHorariosDisponiveis.',
        parameters: {
          type: 'object',
          properties: {
            data: {
              type: 'string',
              description: 'Data da reunião no formato YYYY-MM-DD (exemplo: 2025-11-10)'
            },
            hora: {
              type: 'string',
              description: 'Hora da reunião no formato HH:MM (exemplo: 14:00)'
            },
            nome: {
              type: 'string',
              description: 'Nome do lead (mesmo nome usado em registrarLead)'
            },
            email: {
              type: 'string',
              description: 'E-mail do lead (mesmo email usado em registrarLead)'
            }
          },
          required: ['data', 'hora', 'nome', 'email']
        }
      }
    ]
  }
];

// Configuração do modelo
const modelConfig = {
  model: 'gemini-2.5-flash-lite',
  systemInstruction: systemInstruction,
  tools: tools,
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 2048
  }
};

/**
 * Cria uma nova sessão de chat com o Gemini
 * @returns {Promise} Sessão de chat configurada
 */
export async function createChatSession() {
  const model = genAI.getGenerativeModel(modelConfig);
  console.log('[Gemini Service] Nova sessão de chat criada');
  const chatSession = model.startChat({
    history: []
  });
  
  return chatSession;
}

/**
 * Obtém o modelo configurado (útil para casos especiais)
 * @returns {Object} Modelo Gemini configurado
 */
export function getModel() {
  return genAI.getGenerativeModel(modelConfig);
}