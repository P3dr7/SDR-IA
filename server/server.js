// server.js
import Fastify from 'fastify';
import cors from '@fastify/cors';
import chatRoutes from './src/routes/chat.js';
// import dotenv from 'dotenv';

// dotenv.config();

const fastify = Fastify({
  logger: true
});

// Configurar CORS
await fastify.register(cors, {
  origin: true
});

// Registrar rotas
await fastify.register(chatRoutes, { prefix: '/api' });

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Iniciar servidor
const start = async () => {
  try {
    const port = process.env.PORT || 3000;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Servidor rodando em http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();