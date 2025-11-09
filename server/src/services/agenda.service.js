// src/services/agenda.service.js

/**
 * Busca os horários disponíveis na agenda (próximos 7 dias)
 *
 * @returns {Promise<Object>} Lista de horários disponíveis
 */
export async function getAvailableSlots() {
	console.log("[Agenda Service] Buscando horários disponíveis...");

	try {
		// MOCK: Gerar horários disponíveis para os próximos 7 dias
		const today = new Date();
		const availableSlots = [];

		// Gerar slots para os próximos 7 dias (pula fins de semana)
		for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
			const date = new Date(today);
			date.setDate(date.getDate() + daysAhead);

			// Pular fins de semana (0 = Domingo, 6 = Sábado)
			const dayOfWeek = date.getDay();
			if (dayOfWeek === 0 || dayOfWeek === 6) continue;

			const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD

			// Adicionar 2-3 horários por dia útil
			const times =
				daysAhead <= 3 ? ["10:00", "14:00", "16:00"] : ["10:00", "14:00"];

			times.forEach((time) => {
				availableSlots.push({
					date: dateStr,
					time: time,
					datetime: `${dateStr}T${time}:00`,
					display: `${formatDate(date)} às ${time}`,
				});
			});

			// Limitar a 6-8 slots no total
			if (availableSlots.length >= 6) break;
		}

		console.log(
			"[Agenda Service] Horários encontrados:",
			availableSlots.length
		);

		return {
			success: true,
			slots: availableSlots,
			total: availableSlots.length,
			message: `${availableSlots.length} horários disponíveis nos próximos 7 dias`,
		};
	} catch (error) {
		console.error("[Agenda Service] Erro ao buscar horários:", error);
		return {
			success: false,
			error: true,
			slots: [],
			message: `Erro ao buscar horários: ${error.message}`,
		};
	}
}

/**
 * Agenda uma reunião com o lead
 *
 * @param {Object} details - Detalhes da reunião
 * @param {string} details.data - Data no formato YYYY-MM-DD
 * @param {string} details.hora - Hora no formato HH:MM
 * @param {string} details.nome - Nome do participante
 * @param {string} details.email - E-mail do participante
 * @returns {Promise<Object>} Resultado do agendamento
 */
export async function bookMeeting(details) {
	const { data, hora, nome, email } = details;

	console.log("[Agenda Service] Agendando reunião:", {
		data,
		hora,
		nome,
		email,
	});

	try {
		// MOCK: Simular criação de reunião
		// Na implementação real, você criaria um evento na sua ferramenta de agenda

		await new Promise((resolve) => setTimeout(resolve, 500)); // Simular delay de API

		const meetingDatetime = `${data}T${hora}:00`;
		const meetingId = `meeting_${Date.now()}`;

		// Gerar link de reunião (mock)
		const meetingLink = `https://meet.verzel.com/${meetingId}`;

		// Buscar card_id se já existe (para atualização posterior)
		// Na implementação real, você pode querer buscar isso do contexto da conversa
		const cardId = `card_${Date.now()}`; // Mock

		console.log("[Agenda Service] Reunião agendada com sucesso:", meetingId);

		return {
			success: true,
			meeting_id: meetingId,
			meeting_link: meetingLink,
			meeting_datetime: meetingDatetime,
			card_id: cardId,
			message: "Reunião agendada com sucesso",
			details: {
				data,
				hora,
				nome,
				email,
				display: `${formatDate(new Date(data))} às ${hora}`,
			},
			created_at: new Date().toISOString(),
		};
	} catch (error) {
		console.error("[Agenda Service] Erro ao agendar reunião:", error);
		return {
			success: false,
			error: true,
			message: `Erro ao agendar reunião: ${error.message}`,
		};
	}
}

/**
 * Cancela uma reunião agendada
 *
 * @param {string} meetingId - ID da reunião
 * @returns {Promise<Object>} Resultado do cancelamento
 */
export async function cancelMeeting(meetingId) {
	console.log("[Agenda Service] Cancelando reunião:", meetingId);

	try {
		// MOCK: Simular cancelamento
		// Na implementação real, você cancelaria o evento na sua ferramenta de agenda

		await new Promise((resolve) => setTimeout(resolve, 300));

		return {
			success: true,
			meeting_id: meetingId,
			message: "Reunião cancelada com sucesso",
			cancelled_at: new Date().toISOString(),
		};
	} catch (error) {
		console.error("[Agenda Service] Erro ao cancelar reunião:", error);
		return {
			success: false,
			error: true,
			message: `Erro ao cancelar reunião: ${error.message}`,
		};
	}
}

/**
 * Formata uma data para exibição amigável
 * @param {Date} date - Data para formatar
 * @returns {string} Data formatada
 */
function formatDate(date) {
	const days = [
		"Domingo",
		"Segunda",
		"Terça",
		"Quarta",
		"Quinta",
		"Sexta",
		"Sábado",
	];
	const months = [
		"janeiro",
		"fevereiro",
		"março",
		"abril",
		"maio",
		"junho",
		"julho",
		"agosto",
		"setembro",
		"outubro",
		"novembro",
		"dezembro",
	];

	const dayName = days[date.getDay()];
	const day = date.getDate();
	const month = months[date.getMonth()];

	return `${dayName}, ${day} de ${month}`;
}
