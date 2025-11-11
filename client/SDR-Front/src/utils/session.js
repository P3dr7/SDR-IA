// Gerenciamento de sessão do chat

const SESSION_KEY = "sdr_chat_session";
const MESSAGES_KEY = "sdr_chat_messages";
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos (configurável)

/**
 * Gera um ID anônimo para a sessão
 */
export function generateSessionId() {
	return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Obtém a sessão atual ou cria uma nova
 */
export function getSession() {
	try {
		const stored = localStorage.getItem(SESSION_KEY);
		if (!stored) return createNewSession();

		const session = JSON.parse(stored);
		const now = Date.now();

		// Verifica se a sessão expirou
		if (now - session.lastActivity > SESSION_TIMEOUT) {
			console.log("[Session] Sessão expirada, criando nova");
			return createNewSession();
		}

		// Atualiza última atividade
		session.lastActivity = now;
		localStorage.setItem(SESSION_KEY, JSON.stringify(session));

		return session;
	} catch (error) {
		console.error("[Session] Erro ao ler sessão:", error);
		return createNewSession();
	}
}

/**
 * Cria uma nova sessão
 */
function createNewSession() {
	const session = {
		id: generateSessionId(),
		conversationId: null, // será preenchido pelo backend
		createdAt: Date.now(),
		lastActivity: Date.now(),
	};

	localStorage.setItem(SESSION_KEY, JSON.stringify(session));
	localStorage.removeItem(MESSAGES_KEY); // Limpa mensagens antigas

	console.log("[Session] Nova sessão criada:", session.id);
	return session;
}

/**
 * Atualiza o conversation_id retornado pelo backend
 */
export function updateConversationId(conversationId) {
	const session = getSession();
	session.conversationId = conversationId;
	session.lastActivity = Date.now();
	localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/**
 * Salva mensagens no localStorage
 */
export function saveMessages(messages) {
	try {
		localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
	} catch (error) {
		console.error("[Session] Erro ao salvar mensagens:", error);
	}
}

/**
 * Carrega mensagens do localStorage
 */
export function loadMessages() {
	try {
		const stored = localStorage.getItem(MESSAGES_KEY);
		return stored ? JSON.parse(stored) : [];
	} catch (error) {
		console.error("[Session] Erro ao carregar mensagens:", error);
		return [];
	}
}

/**
 * Limpa a sessão atual
 */
export function clearSession() {
	localStorage.removeItem(SESSION_KEY);
	localStorage.removeItem(MESSAGES_KEY);
	console.log("[Session] Sessão limpa");
}

/**
 * Renova a atividade da sessão
 */
export function renewActivity() {
	const session = getSession();
	session.lastActivity = Date.now();
	localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
