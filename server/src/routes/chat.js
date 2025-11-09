// src/routes/chat.js
import { v4 as uuidv4 } from 'uuid';
import { createChatSession } from '../services/gemini.service.js';
import { createOrUpdateCard, updateCardWithMeeting } from '../services/pipefy.service.js';
import { getAvailableSlots, bookMeeting } from '../services/agenda.service.js';

// Armazenamento em memória para conversas
const conversations = new Map();

export default async function chatRoutes(fastify, options) {
  
  // Endpoint principal de chat
  fastify.post('/chat', async (request, reply) => {
    try {
      const { message, conversation_id } = request.body;

      if (!message) {
        return reply.code(400).send({ 
          error: 'Mensagem é obrigatória' 
        });
      }

      // Gerenciar conversation_id
      let conversationId = conversation_id;
      let chatSession;

      if (!conversationId) {
        // Nova conversa
        conversationId = uuidv4();
        chatSession = await createChatSession();
        conversations.set(conversationId, { chatSession, history: [] });
        fastify.log.info(`Nova conversa criada: ${conversationId}`);
      } else {
        // Conversa existente
        const conversation = conversations.get(conversationId);
        if (!conversation) {
          return reply.code(404).send({ 
            error: 'Conversa não encontrada. Inicie uma nova conversa.' 
          });
        }
        chatSession = conversation.chatSession;
      }

      // Loop de Orquestração com Function Calling
      let finalResponse = null;
      let currentMessage = message;
      let isFirstMessage = true;
      let leadCardId = null; // Armazenar card_id do lead para atualização posterior

      while (!finalResponse) {
        // Enviar mensagem para o Gemini
        const result = await chatSession.sendMessage(currentMessage);
        const response = result.response;

        // Verificar se há chamada de função
        const functionCall = response.functionCalls?.()?.[0];

        if (functionCall) {
          fastify.log.info(`Função chamada: ${functionCall.name}`);
          
          // Executar a função apropriada
          let functionResult;
          
          try {
            switch (functionCall.name) {
              case 'registrarLead':
                const { nome, email, empresa, necessidade, interesse_confirmado } = functionCall.args;
                functionResult = await createOrUpdateCard({
                  nome,
                  email,
                  empresa,
                  necessidade,
                  interesse_confirmado
                });
                break;

              case 'buscarHorariosDisponiveis':
                functionResult = await getAvailableSlots();
                break;

              case 'agendarReuniao':
                const { data, hora, nome: nomeReuniao, email: emailReuniao } = functionCall.args;
                const meetingResult = await bookMeeting({
                  data,
                  hora,
                  nome: nomeReuniao,
                  email: emailReuniao
                });
                
                // Atualizar card no Pipefy com informações da reunião
                if (meetingResult.card_id) {
                  await updateCardWithMeeting(
                    meetingResult.card_id,
                    meetingResult.meeting_link,
                    meetingResult.meeting_datetime
                  );
                }
                
                functionResult = meetingResult;
                break;

              default:
                throw new Error(`Função desconhecida: ${functionCall.name}`);
            }

            fastify.log.info(`Resultado da função ${functionCall.name}:`, functionResult);

          } catch (error) {
            fastify.log.error(`Erro ao executar função ${functionCall.name}:`, error);
            functionResult = { 
              error: true, 
              message: `Erro ao executar ${functionCall.name}: ${error.message}` 
            };
          }

          // Enviar resultado da função de volta para o Gemini
          currentMessage = [{
            functionResponse: {
              name: functionCall.name,
              response: functionResult
            }
          }];
          
          isFirstMessage = false;

        } else {
          // Resposta de texto - fim do loop
          const textResponse = response.text();
          finalResponse = textResponse;
          
          fastify.log.info(`Resposta final gerada para conversa ${conversationId}`);
        }
      }

      // Retornar resposta
      return {
        conversation_id: conversationId,
        message: finalResponse,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      fastify.log.error('Erro no endpoint /chat:', error);
      return reply.code(500).send({ 
        error: 'Erro interno do servidor',
        details: error.message 
      });
    }
  });

  // Endpoint para limpar conversa (útil para testes)
  fastify.delete('/chat/:conversation_id', async (request, reply) => {
    const { conversation_id } = request.params;
    
    if (conversations.has(conversation_id)) {
      conversations.delete(conversation_id);
      return { message: 'Conversa removida com sucesso' };
    }
    
    return reply.code(404).send({ error: 'Conversa não encontrada' });
  });

  // Endpoint para listar conversas ativas (útil para debug)
  fastify.get('/conversations', async (request, reply) => {
    return {
      total: conversations.size,
      conversation_ids: Array.from(conversations.keys())
    };
  });
}