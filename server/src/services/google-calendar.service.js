import { google } from "googleapis";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { updateCardWithMeeting } from "./pipefy.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

// Configuração do Google Calendar
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || "primary";

// Processa a chave privada corretamente
let GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
if (GOOGLE_PRIVATE_KEY) {
	GOOGLE_PRIVATE_KEY = GOOGLE_PRIVATE_KEY.replace(/^["']|["']$/g, "").replace(
		/\\n/g,
		"\n"
	);
}

let calendarClient = null;

/**
 * Inicializa o cliente do Google Calendar
 */
async function initCalendarClient() {
	if (calendarClient) return calendarClient;

	if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
		console.log("[Google Calendar] ❌ Credenciais OAuth2 não configuradas");
		console.log("[Google Calendar] 📝 Execute: node oauth-setup.js");
		return null;
	}

	try {
		console.log("[Google Calendar] 🔑 Inicializando OAuth2...");

		const oauth2Client = new google.auth.OAuth2(
			GOOGLE_CLIENT_ID,
			GOOGLE_CLIENT_SECRET,
			"http://localhost:3000/oauth/callback"
		);

		// Definir refresh token
		oauth2Client.setCredentials({
			refresh_token: GOOGLE_REFRESH_TOKEN,
		});

		console.log("[Google Calendar] ✅ OAuth2 configurado!");
		console.log("[Google Calendar] Target Calendar ID:", GOOGLE_CALENDAR_ID);

		calendarClient = google.calendar({ version: "v3", auth: oauth2Client });

		// Testar acesso
		const calendarInfo = await calendarClient.calendars.get({
			calendarId: GOOGLE_CALENDAR_ID,
		});

		console.log(
			"[Google Calendar] ✅ Acesso confirmado:",
			calendarInfo.data.summary
		);
		console.log("[Google Calendar] 📧 Email:", calendarInfo.data.id);

		return calendarClient;
	} catch (error) {
		console.error("[Google Calendar] ❌ Erro ao inicializar:", error.message);
		return null;
	}
}

/**
 * Valida campos obrigatórios
 */
function validateEventDetails(details) {
	const { data, hora, nome, email } = details;

	if (!data || !hora || !nome || !email) {
		throw new Error("Campos obrigatórios faltando: data, hora, nome, email");
	}

	// Valida formato de email
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		throw new Error(`Email inválido: ${email}`);
	}

	// Valida formato de data (YYYY-MM-DD)
	if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
		throw new Error(`Data inválida (use YYYY-MM-DD): ${data}`);
	}

	// Valida formato de hora (HH:MM)
	if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(hora)) {
		throw new Error(`Hora inválida (use HH:MM): ${hora}`);
	}

	return true;
}

/**
 * Cria um evento diretamente no Google Calendar
 * @param {Object} details - Detalhes do evento
 * @returns {Promise<Object>} Evento criado
 */
export async function createCalendarEvent(details) {
	console.log("[Google Calendar] 📅 Criando evento...");
	console.log("[Google Calendar] Dados:", JSON.stringify(details, null, 2));

	try {
		validateEventDetails(details);
	} catch (error) {
		console.error("[Google Calendar] ❌ Validação falhou:", error.message);
		throw error;
	}

	const { data, hora, nome, email, necessidade, empresa, card_id } = details;

	const calendar = await initCalendarClient();
	if (!calendar) {
		throw new Error(
			"Google Calendar não configurado. Execute: node oauth-setup.js"
		);
	}

	try {
		const startDateTime = new Date(`${data}T${hora}:00-03:00`);

		if (isNaN(startDateTime.getTime())) {
			throw new Error(`Data/hora inválida: ${data} ${hora}`);
		}

		const endDateTime = new Date(startDateTime);
		endDateTime.setMinutes(endDateTime.getMinutes() + 30);

		console.log("[Google Calendar] ⏰ Horário:", {
			start: startDateTime.toISOString(),
			end: endDateTime.toISOString(),
		});

		// ✅ EVENTO COM GOOGLE MEET (funciona com OAuth2!)
		const event = {
			summary: `Reunião de Vendas - ${nome}`,
			description: `Reunião agendada pelo SDR Agent\n\nLead: ${nome}\nEmail: ${email}\nEmpresa: ${
				empresa || "Não informado"
			}\nNecessidade: ${necessidade || "Não informado"}`,
			start: {
				dateTime: startDateTime.toISOString(),
				timeZone: "America/Sao_Paulo",
			},
			end: {
				dateTime: endDateTime.toISOString(),
				timeZone: "America/Sao_Paulo",
			},
			attendees: [
				{ email: email }, // ✅ Funciona com OAuth2!
			],
			conferenceData: {
				createRequest: {
					requestId: `meet-${Date.now()}-${Math.random()
						.toString(36)
						.substring(7)}`,
					conferenceSolutionKey: {
						type: "hangoutsMeet", // ✅ Funciona com OAuth2!
					},
				},
			},
			reminders: {
				useDefault: false,
				overrides: [
					{ method: "email", minutes: 24 * 60 },
					{ method: "popup", minutes: 30 },
				],
			},
		};

		console.log("[Google Calendar] 📤 Enviando para Google...");

		const response = await calendar.events.insert({
			calendarId: GOOGLE_CALENDAR_ID,
			resource: event,
			conferenceDataVersion: 1,
			sendUpdates: "all", // ✅ Envia convites!
		});

		const createdEvent = response.data;

		console.log("[Google Calendar] ✅ EVENTO CRIADO COM SUCESSO!");
		console.log("[Google Calendar] Event ID:", createdEvent.id);
		console.log("[Google Calendar] 🎥 Google Meet:", createdEvent.hangoutLink);
		console.log("[Google Calendar] 📧 Convite enviado para:", email);
		console.log(" card_id recebido:", card_id);
		// Atualizar card no Pipefy com informações da reunião
		if (card_id) {
			console.log("[Google Calendar] 🔄 Atualizando Pipefy...");
			try {
				await updateCardWithMeeting(
					card_id,
					createdEvent.hangoutLink || createdEvent.htmlLink,
					startDateTime.toISOString()
				);
				console.log("[Google Calendar] ✅ Pipefy atualizado!");
			} catch (pipefyError) {
				console.error("[Google Calendar] ⚠️ Erro ao atualizar Pipefy:", pipefyError.message);
				// Não falha a criação do evento se o Pipefy falhar
			}
		} else {
			console.log("[Google Calendar] ⚠️ card_id não fornecido, Pipefy não será atualizado");
		}
		

		return {
			success: true,
			event_id: createdEvent.id,
			meeting_link: createdEvent.hangoutLink,
			meeting_datetime: startDateTime.toISOString(),
			html_link: createdEvent.htmlLink,
			hangout_link: createdEvent.hangoutLink,
			message: "✅ Evento criado com Google Meet! Convite enviado.",
			lead_email: email,
			lead_name: nome,
			has_meet: true,
		};
	} catch (error) {
		console.error("[Google Calendar] ❌ Erro:", error.message);
		throw error;
	}
}

// ============================================
// FUNÇÃO DE TESTE (adicione temporariamente)
// ============================================

/**
 * Testa a criação de eventos com diferentes configurações
 * Use isso para diagnosticar o problema
 */
export async function testEventCreation() {
	console.log("\n🧪 INICIANDO TESTES DE CRIAÇÃO DE EVENTOS\n");

	const calendar = await initCalendarClient();
	if (!calendar) {
		console.error("❌ Calendar não inicializado");
		return;
	}

	const testDate = new Date();
	testDate.setDate(testDate.getDate() + 1);
	testDate.setHours(10, 0, 0, 0);

	const endDate = new Date(testDate);
	endDate.setMinutes(endDate.getMinutes() + 30);

	// TESTE 1: Evento simples (sem meet, sem participantes)
	console.log("📝 TESTE 1: Evento básico (sem Meet, sem participantes)");
	try {
		const response1 = await calendar.events.insert({
			calendarId: GOOGLE_CALENDAR_ID,
			resource: {
				summary: "TESTE 1 - Evento Básico",
				start: {
					dateTime: testDate.toISOString(),
					timeZone: "America/Sao_Paulo",
				},
				end: { dateTime: endDate.toISOString(), timeZone: "America/Sao_Paulo" },
			},
		});
		console.log("✅ TESTE 1 PASSOU! Event ID:", response1.data.id);
	} catch (e) {
		console.error("❌ TESTE 1 FALHOU:", e.message);
	}

	// TESTE 2: Evento com participante (sem meet)
	console.log("\n📝 TESTE 2: Evento com participante (sem Meet)");
	try {
		const response2 = await calendar.events.insert({
			calendarId: GOOGLE_CALENDAR_ID,
			resource: {
				summary: "TESTE 2 - Com Participante",
				start: {
					dateTime: testDate.toISOString(),
					timeZone: "America/Sao_Paulo",
				},
				end: { dateTime: endDate.toISOString(), timeZone: "America/Sao_Paulo" },
				attendees: [{ email: "teste@example.com" }],
			},
			sendUpdates: "none",
		});
		console.log("✅ TESTE 2 PASSOU! Event ID:", response2.data.id);
	} catch (e) {
		console.error("❌ TESTE 2 FALHOU:", e.message);
	}

	// TESTE 3: Evento com Google Meet (hangoutsMeet)
	console.log("\n📝 TESTE 3: Evento com Google Meet (hangoutsMeet)");
	try {
		const response3 = await calendar.events.insert({
			calendarId: GOOGLE_CALENDAR_ID,
			resource: {
				summary: "TESTE 3 - Google Meet",
				start: {
					dateTime: testDate.toISOString(),
					timeZone: "America/Sao_Paulo",
				},
				end: { dateTime: endDate.toISOString(), timeZone: "America/Sao_Paulo" },
				conferenceData: {
					createRequest: {
						requestId: `test-${Date.now()}`,
						conferenceSolutionKey: { type: "hangoutsMeet" },
					},
				},
			},
			conferenceDataVersion: 1,
		});
		console.log("✅ TESTE 3 PASSOU! Event ID:", response3.data.id);
		console.log("   Meet Link:", response3.data.hangoutLink);
	} catch (e) {
		console.error("❌ TESTE 3 FALHOU:", e.message);
		if (e.response) {
			console.error("   Detalhes:", JSON.stringify(e.response.data, null, 2));
		}
	}

	console.log("\n✅ TESTES CONCLUÍDOS\n");
}
/**
 * Lista eventos futuros
 */
export async function listUpcomingEvents(maxResults = 10) {
	const calendar = await initCalendarClient();
	if (!calendar) {
		throw new Error("Google Calendar não configurado");
	}

	try {
		const response = await calendar.events.list({
			calendarId: GOOGLE_CALENDAR_ID,
			timeMin: new Date().toISOString(),
			maxResults,
			singleEvents: true,
			orderBy: "startTime",
		});

		console.log(
			"[Google Calendar] ✅ Listados",
			response.data.items?.length || 0,
			"eventos"
		);
		console.log("[Google Calendar] Calendário consultado:", GOOGLE_CALENDAR_ID);

		return response.data.items || [];
	} catch (error) {
		console.error(
			"[Google Calendar] ❌ Erro ao listar eventos:",
			error.message
		);
		throw error;
	}
}

/**
 * Cancela um evento
 */
export async function cancelCalendarEvent(eventId) {
	const calendar = await initCalendarClient();
	if (!calendar) {
		throw new Error("Google Calendar não configurado");
	}

	try {
		await calendar.events.delete({
			calendarId: GOOGLE_CALENDAR_ID,
			eventId,
			sendUpdates: "all",
		});

		console.log("[Google Calendar] ✅ Evento cancelado:", eventId);
		return true;
	} catch (error) {
		console.error(
			"[Google Calendar] ❌ Erro ao cancelar evento:",
			error.message
		);
		return false;
	}
}
