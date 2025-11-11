// API Client para comunicação com o backend

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * Envia uma mensagem para o backend
 */
export async function sendMessage(message, conversationId = null) {
	try {
		const response = await fetch(`${API_BASE_URL}/api/chat`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				message,
				conversation_id: conversationId,
			}),
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(
				errorData.error || `HTTP ${response.status}: ${response.statusText}`
			);
		}

		return await response.json();
	} catch (error) {
		console.error("[API] Erro ao enviar mensagem:", error);
		throw error;
	}
}

/**
 * Lista conversas ativas (debug)
 */
export async function listConversations() {
	try {
		const response = await fetch(`${API_BASE_URL}/api/conversations`);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		return await response.json();
	} catch (error) {
		console.error("[API] Erro ao listar conversas:", error);
		throw error;
	}
}

/**
 * Remove uma conversa
 */
export async function deleteConversation(conversationId) {
	try {
		const response = await fetch(`${API_BASE_URL}/api/chat/${conversationId}`, {
			method: "DELETE",
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		return await response.json();
	} catch (error) {
		console.error("[API] Erro ao deletar conversa:", error);
		throw error;
	}
}

/**
 * Health check
 */
export async function healthCheck() {
	try {
		const response = await fetch(`${API_BASE_URL}/health`);
		return response.ok;
	} catch (error) {
		return false;
	}
}
