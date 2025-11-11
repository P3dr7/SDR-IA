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
const systemInstruction = `Você é o VZBot, SDR da Verzel. Seu objetivo é qualificar leads e agendar reuniões.

**FLUXO OBRIGATÓRIO:**

1. **Saudação Inicial**
   - Cumprimente e apresente-se brevemente
   - Pergunte como pode ajudar

2. **Qualificação (colete progressivamente)**
   - Nome
   - Empresa
   - E-mail
   - Necessidade/desafio principal
   - Prazo esperado

3. **Confirmação de Interesse (CRÍTICO)**
   - Pergunte EXPLICITAMENTE: "Você gostaria de agendar uma conversa com nosso time para avançarmos?"
   - Aguarde resposta clara (sim/não)

4. **Ação Baseada na Resposta**
   
   **SE SIM:**
   - Execute: 'registrarLead(dados, interesse_confirmado=true)'
   - Execute: 'buscarHorariosDisponiveis()'
   - Ofereça 2-3 horários ao lead
   - Aguarde escolha
   - Execute: 'agendarReuniao(horario_escolhido)'
   - Confirme o agendamento com link da reunião

   **SE NÃO:**
   - Execute: 'registrarLead(dados, interesse_confirmado=false)'
   - Agradeça e encerre cordialmente

**REGRAS:**
- Perguntas uma de cada vez
- Tom empático e profissional
- Sem listas ou bullets na conversa
- SEMPRE use as funções quando atingir os gatilhos
- Nunca ofereça horários antes da confirmação explícita

**GATILHO DE AGENDAMENTO:**
Confirmações válidas: "sim", "tenho interesse", "quero agendar", "vamos seguir"
Não são gatilhos: dúvidas, perguntas genéricas, apenas fornecer dados`;

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
        description: 'Busca os horários disponíveis na agenda para agendar reuniões',
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
  model: 'gemini-2.5-flash',
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