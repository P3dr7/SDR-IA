import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// --- Bloco para resolver o caminho corretamente em ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// -------------------------------------------------------------

// IMPORTANTE: Carregar variáveis ANTES de usá-las
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

// Agora sim, acessar as variáveis
const PIPEFY_API_URL = "https://api.pipefy.com/graphql";
const PIPEFY_API_TOKEN = process.env.PIPEFY_API_TOKEN;
const PIPE_ID = process.env.PIPEFY_PIPE_ID;

console.log("[Pipefy Service] Inicializando serviço Pipefy...");
// console.log(`[Pipefy Service] PIPE_ID: ${PIPE_ID ? PIPE_ID : 'NÃO CONFIGURADO'}`);
// console.log(`[Pipefy Service] API_TOKEN: ${PIPEFY_API_TOKEN ? 'CONFIGURADO' : 'NÃO CONFIGURADO'}`);
let pipeFieldsCache = null;

/**
 * Faz uma requisição GraphQL para o Pipefy
 * @param {string} query - Query ou Mutation GraphQL
 * @param {Object} variables - Variáveis da query
 * @returns {Promise<Object>} Resposta da API
 */
async function pipefyGraphQLRequest(query, variables = {}) {
	try {
		const response = await fetch(PIPEFY_API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${PIPEFY_API_TOKEN}`,
			},
			body: JSON.stringify({
				query,
				variables,
			}),
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const result = await response.json();

		if (result.errors) {
			console.error("[Pipefy API] Errors:", result.errors);
			throw new Error(result.errors[0]?.message || "GraphQL error");
		}

		return result.data;
	} catch (error) {
		console.error("[Pipefy API] Request failed:", error);
		throw error;
	}
}

/**
 * Carrega e mapeia os campos do Pipe dinamicamente
 * @returns {Promise<Object>} Mapeamento de campos { nome: field_id, email: field_id, ... }
 */
async function loadPipeFields() {
	if (pipeFieldsCache) {
		return pipeFieldsCache;
	}

	if (!PIPEFY_API_TOKEN || !PIPE_ID) {
		console.log("[Pipefy Service] Modo MOCK: Sem API_TOKEN ou PIPE_ID");
		return null;
	}

	const query = `
    query GetPipeFields($pipeId: ID!) {
      pipe(id: $pipeId) {
        id
        name
        start_form_fields {
          id
          label
          type
        }
      }
    }
  `;

	try {
		const data = await pipefyGraphQLRequest(query, { pipeId: PIPE_ID });
		const fields = data.pipe.start_form_fields;

		// Mapear campos por label normalizado
		const fieldMapping = {};

		fields.forEach((field) => {
			const normalizedLabel = field.label
				.toLowerCase()
				.normalize("NFD")
				.replace(/[\u0300-\u036f]/g, "") // Remove acentos
				.replace(/\s+/g, "_")
				.replace(/[^a-z0-9_]/g, "");

			fieldMapping[normalizedLabel] = field.id;

			// Criar variações comuns do nome
			if (normalizedLabel.includes("nome")) {
				fieldMapping["nome"] = field.id;
			}
			if (
				normalizedLabel.includes("email") ||
				normalizedLabel.includes("e_mail")
			) {
				fieldMapping["email"] = field.id;
			}
			if (
				normalizedLabel.includes("empresa") ||
				normalizedLabel.includes("company")
			) {
				fieldMapping["empresa"] = field.id;
			}
			if (
				normalizedLabel.includes("necessidade") ||
				normalizedLabel.includes("need")
			) {
				fieldMapping["necessidade"] = field.id;
			}
			if (
				normalizedLabel.includes("interesse") ||
				normalizedLabel.includes("interest")
			) {
				fieldMapping["interesse_confirmado"] = field.id;
			}
			if (
				normalizedLabel.includes("link") &&
				normalizedLabel.includes("reuniao")
			) {
				fieldMapping["link_reuniao"] = field.id;
			}
			if (
				normalizedLabel.includes("data") &&
				normalizedLabel.includes("reuniao")
			) {
				fieldMapping["data_reuniao"] = field.id;
			}
		});

		console.log("[Pipefy Service] Campos mapeados:", Object.keys(fieldMapping));
		pipeFieldsCache = fieldMapping;
		return fieldMapping;
	} catch (error) {
		console.error("[Pipefy Service] Erro ao carregar campos:", error);
		return null;
	}
}

/**
 * Busca um card por e-mail (para verificar duplicatas)
 * @param {string} email - E-mail para buscar
 * @returns {Promise<Object|null>} Card encontrado ou null
 */
export async function findCardByEmail(email) {
	console.log("[Pipefy Service] Buscando card por e-mail:", email);

	// Se não tiver configuração, retorna mock
	if (!PIPEFY_API_TOKEN || !PIPE_ID) {
		console.log("[Pipefy Service] Modo MOCK ativo (sem API_TOKEN ou PIPE_ID)");
		const isDuplicate = email === "duplicado@email.com";
		return isDuplicate ? { id: "mock_card_12345", email, found: true } : null;
	}

	const fieldMapping = await loadPipeFields();
	if (!fieldMapping || !fieldMapping.email) {
		console.error('[Pipefy Service] Campo "email" não encontrado no pipe');
		return null;
	}

	const query = `
    query SearchCards($pipeId: ID!) {
      cards(pipe_id: $pipeId, first: 50) {
        edges {
          node {
            id
            title
            fields {
              name
              value
              field {
                id
              }
            }
          }
        }
      }
    }
  `;

	try {
		const data = await pipefyGraphQLRequest(query, { pipeId: PIPE_ID });
		const cards = data.cards?.edges || [];

		// Buscar card com o email específico
		const emailFieldId = fieldMapping.email;

		for (const edge of cards) {
			const card = edge.node;
			const emailField = card.fields.find((f) => f.field.id === emailFieldId);

			if (
				emailField &&
				emailField.value?.toLowerCase() === email.toLowerCase()
			) {
				console.log("[Pipefy Service] Card encontrado:", card.id);
				return {
					id: card.id,
					title: card.title,
					fields: card.fields,
					found: true,
				};
			}
		}

		console.log("[Pipefy Service] Nenhum card encontrado com este email");
		return null;
	} catch (error) {
		console.error("[Pipefy Service] Erro ao buscar card:", error);
		return null;
	}
}

/**
 * Prepara os campos para criar/atualizar no Pipefy
 * @param {Object} data - Dados do lead
 * @param {Object} fieldMapping - Mapeamento de campos
 * @param {boolean} isUpdate - Se é uma atualização
 * @returns {Array} Array de campos formatados
 */
function prepareFields(data, fieldMapping, isUpdate = false) {
	const { nome, email, empresa, necessidade, interesse_confirmado } = data;
	const fields = [];

	// Nome
	if (fieldMapping.nome && nome) {
		fields.push({
			field_id: fieldMapping.nome,
			field_value: nome,
		});
	}

	// Email
	if (fieldMapping.email && email) {
		fields.push({
			field_id: fieldMapping.email,
			field_value: email,
		});
	}

	// Empresa (opcional)
	if (fieldMapping.empresa && empresa) {
		fields.push({
			field_id: fieldMapping.empresa,
			field_value: empresa,
		});
	}

	// Necessidade
	if (fieldMapping.necessidade && necessidade) {
		fields.push({
			field_id: fieldMapping.necessidade,
			field_value: necessidade,
		});
	}

	// Interesse Confirmado
	if (fieldMapping.interesse_confirmado && interesse_confirmado !== undefined) {
		fields.push({
			field_id: fieldMapping.interesse_confirmado,
			field_value: interesse_confirmado ? "Sim" : "Não",
		});
	}

	return fields;
}

/**
 * Cria ou atualiza um card no Pipefy
 * @param {Object} data - Dados do lead
 * @returns {Promise<Object>} Resultado da operação
 */
export async function createOrUpdateCard(data) {
	const { nome, email, empresa, necessidade, interesse_confirmado } = data;

	console.log("[Pipefy Service] Processando lead:", { nome, email, empresa });

	try {
		// 1. Verificar se já existe um card com este e-mail
		const existingCard = await findCardByEmail(email);

		if (existingCard) {
			// 2a. ATUALIZAR card existente
			console.log("[Pipefy Service] E-mail já existe, atualizando card...");

			// Se estiver em modo mock
			if (!PIPEFY_API_TOKEN || !PIPE_ID) {
				return {
					success: true,
					action: "updated",
					card_id: existingCard.id,
					message: "Lead atualizado com sucesso (MOCK)",
					data: {
						nome,
						email,
						empresa,
						necessidade,
						interesse_confirmado,
						updated_at: new Date().toISOString(),
					},
				};
			}

			const fieldMapping = await loadPipeFields();
			if (!fieldMapping) {
				throw new Error("Não foi possível carregar os campos do pipe");
			}

			const updateMutation = `
        mutation UpdateCard($cardId: ID!, $fields: [UpdateCardFieldInput!]!) {
          updateCard(input: { id: $cardId, fields_attributes: $fields }) {
            card {
              id
              title
              updated_at
            }
          }
        }
      `;

			const fieldsToUpdate = prepareFields(data, fieldMapping, true);

			const result = await pipefyGraphQLRequest(updateMutation, {
				cardId: existingCard.id,
				fields: fieldsToUpdate,
			});

			return {
				success: true,
				action: "updated",
				card_id: result.updateCard.card.id,
				message: "Lead atualizado com sucesso",
				data: {
					nome,
					email,
					empresa,
					necessidade,
					interesse_confirmado,
					updated_at: result.updateCard.card.updated_at,
				},
			};
		} else {
			// 2b. CRIAR novo card
			console.log("[Pipefy Service] Criando novo card...");

			// Se estiver em modo mock
			if (!PIPEFY_API_TOKEN || !PIPE_ID) {
				return {
					success: true,
					action: "created",
					card_id: `card_${Date.now()}`,
					message: "Lead registrado com sucesso (MOCK)",
					data: {
						nome,
						email,
						empresa,
						necessidade,
						interesse_confirmado,
						created_at: new Date().toISOString(),
					},
				};
			}

			const fieldMapping = await loadPipeFields();
			if (!fieldMapping) {
				throw new Error("Não foi possível carregar os campos do pipe");
			}

			const createMutation = `
        mutation CreateCard($pipeId: ID!, $fields: [CardFieldInput!]!) {
          createCard(input: { pipe_id: $pipeId, fields_attributes: $fields }) {
            card {
              id
              title
              created_at
            }
          }
        }
      `;

			const fieldsToCreate = prepareFields(data, fieldMapping, false);

			const result = await pipefyGraphQLRequest(createMutation, {
				pipeId: PIPE_ID,
				fields: fieldsToCreate,
			});

			return {
				success: true,
				action: "created",
				card_id: result.createCard.card.id,
				message: "Lead registrado com sucesso",
				data: {
					nome,
					email,
					empresa,
					necessidade,
					interesse_confirmado,
					created_at: result.createCard.card.created_at,
				},
			};
		}
	} catch (error) {
		console.error("[Pipefy Service] Erro ao processar card:", error);
		return {
			success: false,
			error: true,
			message: `Erro ao processar lead: ${error.message}`,
		};
	}
}

/**
 * Atualiza um card existente com informações da reunião agendada
 * @param {string} cardId - ID do card no Pipefy
 * @param {string} meetingLink - Link da reunião
 * @param {string} meetingDatetime - Data e hora da reunião
 * @returns {Promise<Object>} Resultado da atualização
 */
export async function updateCardWithMeeting(
	cardId,
	meetingLink,
	meetingDatetime
) {
	console.log("[Pipefy Service] Atualizando card com reunião:", {
		cardId,
		meetingLink,
		meetingDatetime,
	});

	try {
		// Se estiver em modo mock
		if (!PIPEFY_API_TOKEN || !PIPE_ID) {
			console.log("[Pipefy Service] Modo MOCK ativo");
			await new Promise((resolve) => setTimeout(resolve, 300));
			return {
				success: true,
				card_id: cardId,
				message: "Card atualizado com informações da reunião (MOCK)",
				meeting_link: meetingLink,
				meeting_datetime: meetingDatetime,
				updated_at: new Date().toISOString(),
			};
		}

		const fieldMapping = await loadPipeFields();
		if (!fieldMapping) {
			throw new Error("Não foi possível carregar os campos do pipe");
		}

		const updateMutation = `
      mutation UpdateCardWithMeeting($cardId: ID!, $fields: [UpdateCardFieldInput!]!) {
        updateCard(input: { id: $cardId, fields_attributes: $fields }) {
          card {
            id
            title
            updated_at
          }
        }
      }
    `;

		const fieldsToUpdate = [];

		// Link da reunião
		if (fieldMapping.link_reuniao) {
			fieldsToUpdate.push({
				field_id: fieldMapping.link_reuniao,
				field_value: meetingLink,
			});
		}

		// Data da reunião
		if (fieldMapping.data_reuniao) {
			fieldsToUpdate.push({
				field_id: fieldMapping.data_reuniao,
				field_value: meetingDatetime,
			});
		}

		if (fieldsToUpdate.length === 0) {
			console.warn(
				"[Pipefy Service] Nenhum campo de reunião encontrado no pipe"
			);
			return {
				success: true,
				card_id: cardId,
				message: "Card não possui campos de reunião configurados",
				meeting_link: meetingLink,
				meeting_datetime: meetingDatetime,
			};
		}

		const result = await pipefyGraphQLRequest(updateMutation, {
			cardId,
			fields: fieldsToUpdate,
		});

		return {
			success: true,
			card_id: result.updateCard.card.id,
			message: "Card atualizado com informações da reunião",
			meeting_link: meetingLink,
			meeting_datetime: meetingDatetime,
			updated_at: result.updateCard.card.updated_at,
		};
	} catch (error) {
		console.error("[Pipefy Service] Erro ao atualizar card:", error);
		return {
			success: false,
			error: true,
			message: `Erro ao atualizar card: ${error.message}`,
		};
	}
}

/**
 * Lista todos os campos do Pipe (útil para debug)
 */
export async function getPipeFields() {
	if (!PIPEFY_API_TOKEN || !PIPE_ID) {
		console.log(
			"[Pipefy Service] Configure PIPEFY_API_TOKEN e PIPEFY_PIPE_ID no .env"
		);
		return null;
	}

	const fieldMapping = await loadPipeFields();
	return fieldMapping;
}

/**
 * Limpa o cache de campos (útil se você modificar o pipe)
 */
export function clearFieldsCache() {
	pipeFieldsCache = null;
	console.log("[Pipefy Service] Cache de campos limpo");
}
