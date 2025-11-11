import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createCalendarEvent, listUpcomingEvents } from './google-calendar.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });


const CALENDLY_API_URL = 'https://api.calendly.com';
const CALENDLY_API_TOKEN = process.env.CALENDLY_API_TOKEN;
const CALENDLY_EVENT_TYPE_URI = process.env.CALENDLY_EVENT_TYPE_URI;

console.log('[Agenda Service] Configuração Calendly:', {
  CALENDLY_API_TOKEN: CALENDLY_API_TOKEN ? '✔️ Configurado' : '❌ Não configurado',
  CALENDLY_EVENT_TYPE_URI: CALENDLY_EVENT_TYPE_URI ? '✔️ Configurado' : '❌ Não configurado'
});

console.log('[Agenda Service] Configuração Google Calendar:', {
  USE_GOOGLE_CALENDAR: process.env.USE_GOOGLE_CALENDAR === 'true' ? '✔️ Ativado' : '❌ Desativado'
});

console.log('dados google calendar', {
  GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL ? '✔️ Configurado' : '❌ Não configurado',
  GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY ? '✔️ Configurado' : '❌ Não configurado'
});

// Flag para decidir qual serviço usar
const USE_GOOGLE_CALENDAR = process.env.USE_GOOGLE_CALENDAR === 'true';

/**
 * Faz uma requisição para a API do Calendly
 * @param {string} endpoint - Endpoint da API
 * @param {Object} options - Opções da requisição
 * @returns {Promise<Object>} Resposta da API
 */
async function calendlyRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${CALENDLY_API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CALENDLY_API_TOKEN}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[Calendly API] Request failed:', error);
    throw error;
  }
}

/**
 * Busca os horários disponíveis na agenda (próximos 7 dias)
 * 
 * @returns {Promise<Object>} Lista de horários disponíveis
 */
export async function getAvailableSlots() {
  console.log('[Agenda Service] Buscando horários disponíveis...');
  console.log('[Agenda Service] Usando:', USE_GOOGLE_CALENDAR ? 'Google Calendar' : 'Calendly');

  // Se estiver usando Google Calendar
  if (USE_GOOGLE_CALENDAR) {
    try {
      console.log('[Agenda Service] Gerando slots disponíveis baseados no Google Calendar...');
      
      // Buscar eventos já agendados
      const upcomingEvents = await listUpcomingEvents(50);
      
      // Criar lista de horários ocupados
      const busyTimes = upcomingEvents.map(event => ({
        start: new Date(event.start.dateTime || event.start.date),
        end: new Date(event.end.dateTime || event.end.date)
      }));

      // Gerar slots disponíveis
      const availableSlots = generateAvailableSlots(busyTimes);

      console.log('[Agenda Service] Horários disponíveis gerados:', availableSlots.length);

      return {
        success: true,
        slots: availableSlots,
        total: availableSlots.length,
        message: `${availableSlots.length} horários disponíveis nos próximos 7 dias`
      };
      
    } catch (error) {
      console.error('[Agenda Service] Erro ao buscar horários no Google Calendar:', error);
      console.log('[Agenda Service] Usando modo MOCK como fallback');
      return getMockAvailableSlots();
    }
  }

  // Se não tiver configuração do Calendly, usar mock
  if (!CALENDLY_API_TOKEN || !CALENDLY_EVENT_TYPE_URI) {
    console.log('[Agenda Service] Modo MOCK ativo (sem CALENDLY_API_TOKEN ou CALENDLY_EVENT_TYPE_URI)');
    return getMockAvailableSlots();
  }

  try {
    // Calcular range de datas (próximos 7 dias)
    const now = new Date();
    
    const startTime = new Date(now);
    // Adicionar 1 hora ao horário atual para garantir que está no futuro
    startTime.setHours(startTime.getHours() + 1);
    startTime.setMinutes(0, 0, 0);
    
    const endTime = new Date(now);
    // Adicionar exatamente 7 dias (168 horas)
    endTime.setDate(endTime.getDate() + 7);
    endTime.setHours(endTime.getHours() + 1);
    endTime.setMinutes(0, 0, 0);

    console.log('[Agenda Service] Buscando slots de', startTime.toISOString(), 'até', endTime.toISOString());
    
    // Calcular diferença em dias para debug
    const diffInMs = endTime - startTime;
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
    console.log('[Agenda Service] Range:', diffInDays.toFixed(2), 'dias');

    // Buscar slots disponíveis no Calendly
    const endpoint = `/event_type_available_times?event_type=${encodeURIComponent(CALENDLY_EVENT_TYPE_URI)}&start_time=${startTime.toISOString()}&end_time=${endTime.toISOString()}`;
    
    const data = await calendlyRequest(endpoint);
    
    const availableSlots = data.collection.map(slot => {
      const slotDate = new Date(slot.start_time);
      return {
        date: slotDate.toISOString().split('T')[0],
        time: slotDate.toTimeString().substring(0, 5),
        datetime: slot.start_time,
        display: `${formatDate(slotDate)} às ${slotDate.toTimeString().substring(0, 5)}`,
        calendly_time: slot.start_time
      };
    }).slice(0, 8); // Limitar a 8 slots

    console.log('[Agenda Service] Horários encontrados:', availableSlots.length);

    return {
      success: true,
      slots: availableSlots,
      total: availableSlots.length,
      message: `${availableSlots.length} horários disponíveis nos próximos 7 dias`
    };
    
  } catch (error) {
    console.error('[Agenda Service] Erro ao buscar horários no Calendly:', error);
    console.log('[Agenda Service] Usando modo MOCK como fallback');
    return getMockAvailableSlots();
  }
}

/**
 * Gera slots disponíveis baseado em horários ocupados
 * @param {Array} busyTimes - Lista de horários já ocupados
 * @returns {Array} Lista de slots disponíveis
 */
function generateAvailableSlots(busyTimes = []) {
  const availableSlots = [];
  const today = new Date();
  
  // Horários de trabalho: 9h às 18h
  const workingHours = {
    start: 9,
    end: 18,
    interval: 60 // Slots de 1 hora
  };

  // Gerar slots para os próximos 7 dias
  for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
    const date = new Date(today);
    date.setDate(date.getDate() + daysAhead);
    
    // Pular fins de semana (0 = Domingo, 6 = Sábado)
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // Gerar slots para cada hora do dia
    for (let hour = workingHours.start; hour < workingHours.end; hour++) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);
      
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotStart.getMinutes() + workingHours.interval);

      // Verificar se o slot está ocupado
      const isOccupied = busyTimes.some(busy => {
        return slotStart < busy.end && slotEnd > busy.start;
      });

      // Se não estiver ocupado, adicionar aos disponíveis
      if (!isOccupied) {
        const dateStr = slotStart.toISOString().split('T')[0];
        const timeStr = slotStart.toTimeString().substring(0, 5);
        
        availableSlots.push({
          date: dateStr,
          time: timeStr,
          datetime: slotStart.toISOString(),
          display: `${formatDate(slotStart)} às ${timeStr}`,
          google_time: slotStart.toISOString()
        });
      }
    }

    // Limitar a 8 slots no total
    if (availableSlots.length >= 8) break;
  }

  return availableSlots.slice(0, 8);
}

/**
 * Gera slots mockados (fallback quando nenhum serviço está configurado)
 * @returns {Object} Lista de horários mockados
 */
function getMockAvailableSlots() {
  const today = new Date();
  const availableSlots = [];

  // Gerar slots para os próximos 7 dias (pula fins de semana)
  for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
    const date = new Date(today);
    date.setDate(date.getDate() + daysAhead);
    
    // Pular fins de semana (0 = Domingo, 6 = Sábado)
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const dateStr = date.toISOString().split('T')[0];

    // Adicionar 2-3 horários por dia útil
    const times = daysAhead <= 3 ? ['10:00', '14:00', '16:00'] : ['10:00', '14:00'];
    
    times.forEach(time => {
      availableSlots.push({
        date: dateStr,
        time: time,
        datetime: `${dateStr}T${time}:00`,
        display: `${formatDate(date)} às ${time}`
      });
    });

    if (availableSlots.length >= 6) break;
  }

  return {
    success: true,
    slots: availableSlots,
    total: availableSlots.length,
    message: `${availableSlots.length} horários disponíveis (MOCK)`
  };
}

/**
 * Agenda uma reunião com o lead
 * Usa Google Calendar ou Calendly dependendo da configuração
 * 
 * @param {Object} details - Detalhes da reunião
 * @param {string} details.data - Data no formato YYYY-MM-DD
 * @param {string} details.hora - Hora no formato HH:MM
 * @param {string} details.nome - Nome do participante
 * @param {string} details.email - E-mail do participante
 * @param {string} [details.card_id] - ID do card no Pipefy (opcional)
 * @param {string} [details.empresa] - Nome da empresa (opcional)
 * @param {string} [details.necessidade] - Necessidade do cliente (opcional)
 * @returns {Promise<Object>} Resultado do agendamento
 */
export async function bookMeeting(details) {
  const { data, hora, nome, email, card_id, empresa, necessidade } = details;
  
  console.log('[Agenda Service] Criando evento:', { data, hora, nome, email, card_id });
  console.log('[Agenda Service] Usando:', USE_GOOGLE_CALENDAR ? 'Google Calendar' : 'Calendly');
  console.log('[Agenda Service] Card ID:', card_id);
  // Se estiver usando Google Calendar
  if (USE_GOOGLE_CALENDAR) {
    try {
      console.log('[Agenda Service] Criando evento no Google Calendar...');
      
      // Chamar a função createCalendarEvent com os detalhes
      const result = await createCalendarEvent({
        data,
        hora,
        nome,
        email,
        empresa,
        necessidade,
        card_id
      });

      console.log('[Agenda Service] ✅ Evento criado no Google Calendar com sucesso');
      console.log('[Agenda Service] Event ID:', result.event_id);

      const startTime = new Date(`${data}T${hora}:00`);

      return {
        success: result.success,
        meeting_id: result.event_id,
        meeting_link: result.meeting_link,
        meeting_datetime: result.meeting_datetime,
        card_id: card_id,
        event_uri: result.html_link,
        message: result.message,
        details: {
          data,
          hora,
          nome,
          email,
          empresa,
          necessidade,
          display: `${formatDate(startTime)} às ${hora}`
        },
        created_at: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('[Agenda Service] Erro ao criar evento no Google Calendar:', error);
      console.log('[Agenda Service] Usando modo MOCK como fallback');
      return getMockBooking(details);
    }
  }

  // Se não tiver configuração do Calendly, usar mock
  if (!CALENDLY_API_TOKEN || !CALENDLY_EVENT_TYPE_URI) {
    console.log('[Agenda Service] Modo MOCK ativo');
    return getMockBooking(details);
  }

  try {
    // Passo 1: Criar um Single-Use Scheduling Link
    const startTime = new Date(`${data}T${hora}:00`);
    const endTime = new Date(startTime);
    
    // Calcular duração baseada no event type (30min padrão)
    endTime.setMinutes(endTime.getMinutes() + 30);

    console.log('[Agenda Service] Criando single-use link...');
    
    const schedulingLinkPayload = {
      max_event_count: 1,
      owner: CALENDLY_EVENT_TYPE_URI,
      owner_type: "EventType"
    };

    const linkResponse = await calendlyRequest('/scheduling_links', {
      method: 'POST',
      body: JSON.stringify(schedulingLinkPayload)
    });

    const schedulingLink = linkResponse.resource.booking_url;
    console.log('[Agenda Service] Single-use link criado:', schedulingLink);

    const meetingLink = `${schedulingLink}?name=${encodeURIComponent(nome)}&email=${encodeURIComponent(email)}`;
    const meetingDatetime = startTime.toISOString();
    const meetingId = linkResponse.resource.uri.split('/').pop();

    console.log('[Agenda Service] ✅ Link de agendamento criado com sucesso');
    console.log('[Agenda Service] Meeting Link:', meetingLink);

    return {
      success: true,
      meeting_id: meetingId,
      meeting_link: meetingLink,
      meeting_datetime: meetingDatetime,
      card_id: card_id,
      scheduling_link_uri: linkResponse.resource.uri,
      message: 'Evento criado no Calendly com sucesso',
      details: {
        data,
        hora,
        nome,
        email,
        display: `${formatDate(startTime)} às ${hora}`
      },
      created_at: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('[Agenda Service] Erro ao criar evento no Calendly:', error);
    console.log('[Agenda Service] Usando modo MOCK como fallback');
    return getMockBooking(details);
  }
}

/**
 * Cria um agendamento mockado (fallback)
 * @param {Object} details - Detalhes da reunião
 * @returns {Object} Resultado mockado
 */
function getMockBooking(details) {
  const { data, hora, nome, email, card_id } = details;
  
  const meetingDatetime = `${data}T${hora}:00`;
  const meetingId = `meeting_${Date.now()}`;
  const meetingLink = `https://meet.verzel.com/${meetingId}`;

  return {
    success: true,
    meeting_id: meetingId,
    meeting_link: meetingLink,
    meeting_datetime: meetingDatetime,
    card_id: card_id,
    message: 'Reunião agendada com sucesso (MOCK)',
    details: {
      data,
      hora,
      nome,
      email,
      display: `${formatDate(new Date(data))} às ${hora}`
    },
    created_at: new Date().toISOString()
  };
}

/**
 * Obtém informações do usuário autenticado no Calendly
 * @returns {Promise<Object>} Dados do usuário
 */
export async function getCalendlyUser() {
  if (!CALENDLY_API_TOKEN) {
    throw new Error('CALENDLY_API_TOKEN não configurado');
  }

  try {
    const data = await calendlyRequest('/users/me');
    console.log('[Agenda Service] Usuário Calendly:', data.resource.name);
    return data.resource;
  } catch (error) {
    console.error('[Agenda Service] Erro ao buscar usuário:', error);
    throw error;
  }
}

/**
 * Lista os event types disponíveis
 * @returns {Promise<Array>} Lista de event types
 */
export async function getEventTypes() {
  if (!CALENDLY_API_TOKEN) {
    throw new Error('CALENDLY_API_TOKEN não configurado');
  }

  try {
    // Primeiro, pegar o user URI
    const user = await getCalendlyUser();
    
    // Depois, listar os event types
    const data = await calendlyRequest(`/event_types?user=${user.uri}`);
    
    console.log('[Agenda Service] Event Types encontrados:', data.collection.length);
    return data.collection;
  } catch (error) {
    console.error('[Agenda Service] Erro ao listar event types:', error);
    throw error;
  }
}

/**
 * Cancela uma reunião agendada
 * 
 * @param {string} eventUri - URI do evento no Calendly
 * @param {string} reason - Motivo do cancelamento
 * @returns {Promise<Object>} Resultado do cancelamento
 */
export async function cancelMeeting(eventUri, reason = 'Cancelado pelo cliente') {
  console.log('[Agenda Service] Cancelando reunião:', eventUri);

  if (!CALENDLY_API_TOKEN) {
    console.log('[Agenda Service] Modo MOCK ativo');
    return {
      success: true,
      message: 'Reunião cancelada (MOCK)',
      cancelled_at: new Date().toISOString()
    };
  }

  try {
    await calendlyRequest(`/scheduled_events/${eventUri}/cancellation`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });

    return {
      success: true,
      message: 'Reunião cancelada com sucesso',
      cancelled_at: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('[Agenda Service] Erro ao cancelar reunião:', error);
    return {
      success: false,
      error: true,
      message: `Erro ao cancelar reunião: ${error.message}`
    };
  }
}

/**
 * Formata uma data para exibição amigável
 * @param {Date} date - Data para formatar
 * @returns {string} Data formatada
 */
function formatDate(date) {
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  
  return `${dayName}, ${day} de ${month}`;
}