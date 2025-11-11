import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// -------------------------------------------------------------

//Carregar variáveis ANTES de usá-las
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });


const PIPEFY_API_URL = "https://api.pipefy.com/graphql";
const PIPEFY_API_TOKEN = process.env.PIPEFY_API_TOKEN;
const PIPE_ID = process.env.PIPEFY_PIPE_ID;

console.log("[Pipefy Service] Inicializando serviço Pipefy...");
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
			const errorText = await response.text();
			console.error(`[Pipefy API] HTTP Error ${response.status}:`, errorText);
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const result = await response.json();

		if (result.errors) {
			console.error(
				"[Pipefy API] GraphQL Errors:",
				JSON.stringify(result.errors, null, 2)
			);
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

		const fieldMapping = {};

		fields.forEach((field) => {
			const normalizedLabel = field.label
				.toLowerCase()
				.normalize("NFD")
				.replace(/[\u0300-\u036f]/g, "")
				.replace(/\s+/g, "_")
				.replace(/[^a-z0-9_]/g, "");

			// MUDANÇA: Guardar id E type
			fieldMapping[normalizedLabel] = {
				id: field.id,
				type: field.type,
			};

			// Criar variações comuns
			if (normalizedLabel.includes("nome")) {
				fieldMapping["nome"] = { id: field.id, type: field.type };
			}
			if (
				normalizedLabel.includes("email") ||
				normalizedLabel.includes("e_mail")
			) {
				fieldMapping["email"] = { id: field.id, type: field.type };
			}
			if (
				normalizedLabel.includes("empresa") ||
				normalizedLabel.includes("company")
			) {
				fieldMapping["empresa"] = { id: field.id, type: field.type };
			}
			if (
				normalizedLabel.includes("necessidade") ||
				normalizedLabel.includes("need")
			) {
				fieldMapping["necessidade"] = { id: field.id, type: field.type };
			}
			if (
				normalizedLabel.includes("interesse") ||
				normalizedLabel.includes("interest")
			) {
				fieldMapping["interesse_confirmado"] = {
					id: field.id,
					type: field.type,
				};
			}
			if (
				normalizedLabel.includes("link") &&
				normalizedLabel.includes("reuniao")
			) {
				fieldMapping["link_reuniao"] = { id: field.id, type: field.type };
			}
			if (
				normalizedLabel.includes("data") &&
				normalizedLabel.includes("reuniao")
			) {
				fieldMapping["data_reuniao"] = { id: field.id, type: field.type };
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
 * CORRIGIDO: Usa paginação adequada e busca em todas as páginas
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

	const emailFieldId = fieldMapping.email.id;

	// Query com paginação melhorada
	const query = `
    query SearchCards($pipeId: ID!, $after: String) {
      cards(pipe_id: $pipeId, first: 50, after: $after) {
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
          cursor
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

	try {
		let hasNextPage = true;
		let after = null;

		// Buscar em todas as páginas até encontrar o email
		while (hasNextPage) {
			const data = await pipefyGraphQLRequest(query, {
				pipeId: PIPE_ID,
				after,
			});

			const cards = data.cards?.edges || [];
			const pageInfo = data.cards?.pageInfo || {};

			// Buscar card com o email específico nesta página
			for (const edge of cards) {
				const card = edge.node;
				const emailField = card.fields.find((f) => f.field.id === emailFieldId);

				if (
					emailField &&
					emailField.value?.toLowerCase().trim() === email.toLowerCase().trim()
				) {
					console.log("[Pipefy Service] ✅ Card encontrado:", card.id);
					return {
						id: card.id,
						title: card.title,
						fields: card.fields,
						found: true,
					};
				}
			}

			// Verificar se há mais páginas
			hasNextPage = pageInfo.hasNextPage;
			after = pageInfo.endCursor;

			if (hasNextPage) {
				console.log("[Pipefy Service] Buscando próxima página...");
			}
		}

		console.log("[Pipefy Service] ❌ Nenhum card encontrado com este email");
		return null;
	} catch (error) {
		console.error("[Pipefy Service] ❌ Erro ao buscar card:", error);
		throw error; // Propagar o erro para melhor tratamento
	}
}

function formatFieldValue(value, fieldType) {
	// Se já for array, retorna como está
	if (Array.isArray(value)) {
		return value;
	}

	// SEMPRE retorna como array (a API espera isso)
	return [String(value)];
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
			field_id: fieldMapping.nome.id,
			field_value: nome,
			_field_type: fieldMapping.nome.type, // <-- mudou aqui
		});
	}

	// Email
	if (fieldMapping.email && email) {
		fields.push({
			field_id: fieldMapping.email.id,
			field_value: email,
			_field_type: fieldMapping.email.type, // <-- mudou aqui
		});
	}

	// Empresa (opcional)
	if (fieldMapping.empresa && empresa) {
		fields.push({
			field_id: fieldMapping.empresa.id,
			field_value: empresa,
			_field_type: fieldMapping.empresa.type, // <-- mudou aqui
		});
	}

	// Necessidade
	if (fieldMapping.necessidade && necessidade) {
		fields.push({
			field_id: fieldMapping.necessidade.id,
			field_value: necessidade,
			_field_type: fieldMapping.necessidade.type, // <-- mudou aqui
		});
	}

	// Interesse Confirmado
	if (
		fieldMapping.interesse_confirmado !== undefined &&
		interesse_confirmado !== undefined
	) {
		const valorInteresse = interesse_confirmado ? "Sim" : "Nao";
		fields.push({
			field_id: fieldMapping.interesse_confirmado.id,
			field_value: valorInteresse,
			_field_type: fieldMapping.interesse_confirmado.type, // <-- mudou aqui
		});
	}

	console.log(
		`[Pipefy Service] ${isUpdate ? "Atualizando" : "Criando"} com ${
			fields.length
		} campos`
	);
	return fields;
}

/**
 * Cria ou atualiza um card no Pipefy
 * @param {Object} data - Dados do lead
 * @returns {Promise<Object>} Resultado da operação
 */
export async function createOrUpdateCard(data) {
	const { nome, email, empresa, necessidade, interesse_confirmado } = data;

	console.log("[Pipefy Service] 📝 Processando lead:", {
		nome,
		email,
		empresa,
	});

	try {
		// 1. Verificar se já existe um card com este e-mail
		const existingCard = await findCardByEmail(email);

		if (existingCard) {
			// 2a. ATUALIZAR card existente
			console.log("[Pipefy Service] 🔄 E-mail já existe, atualizando card...");

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

			const fieldsToUpdate = prepareFields(data, fieldMapping, true);

			if (fieldsToUpdate.length === 0) {
				console.warn("[Pipefy Service] ⚠️ Nenhum campo para atualizar");
				return {
					success: true,
					action: "no_changes",
					card_id: existingCard.id,
					message: "Nenhuma atualização necessária",
				};
			}

			console.log("[Pipefy Service] Atualizando card ID:", existingCard.id);
			console.log("[Pipefy Service] Campos a atualizar:", fieldsToUpdate);

			// ====== MUDANÇA 1: UndefinedInput ao invés de String ======
			const updateMutation = `
				mutation UpdateCardField($cardId: ID!, $fieldId: ID!, $newValue: [UndefinedInput]) {
					updateCardField(input: { 
					card_id: $cardId, 
					field_id: $fieldId, 
					new_value: $newValue 
					}) {
					card {
						id
						title
						updated_at
					}
					}
				}
				`;

			let lastResult = null;

			// Atualizar cada campo separadamente
			for (const field of fieldsToUpdate) {
				
				console.log(
					`[Pipefy Service] Atualizando campo ${field.field_id} (tipo: ${field.field_type})...`
				);
				try {
					const formattedValue = formatFieldValue(
						field.field_value,
						field.field_type
					);

					lastResult = await pipefyGraphQLRequest(updateMutation, {
						cardId: existingCard.id,
						fieldId: field.field_id,
						newValue: formattedValue, // Valor formatado
					});

					// ====== MUDANÇA 4: Log de sucesso ======
					console.log(`[Pipefy Service] ✓ Campo ${field.field_id} atualizado`);
				} catch (error) {
					// ====== MUDANÇA 5: Melhor log de erro ======
					console.error(
						`[Pipefy Service] ✗ Erro ao atualizar campo ${field.field_id}:`,
						error.message
					);
					// Continua atualizando os outros campos
				}
			}

			console.log("[Pipefy Service] ✅ Card atualizado com sucesso");

			return {
				success: true,
				action: "updated",
				card_id: existingCard.id,
				message: "Lead atualizado com sucesso",
				data: {
					nome,
					email,
					empresa,
					necessidade,
					interesse_confirmado,
					updated_at:
						lastResult?.updateCardField?.card?.updated_at ||
						new Date().toISOString(),
				},
			};
		} else {
			console.log("[Pipefy Service] ➕ Criando novo card...");

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
        mutation CreateCard($pipeId: ID!, $fields: [FieldValueInput!]!) {
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

			if (fieldsToCreate.length === 0) {
				throw new Error("Nenhum campo válido para criar o card");
			}

			// Remover _field_type antes de enviar para API
			const fieldsForAPI = fieldsToCreate.map(({ field_id, field_value }) => ({
				field_id,
				field_value,
			}));

			console.log("[Pipefy Service] Campos a criar:", fieldsForAPI);

			const result = await pipefyGraphQLRequest(createMutation, {
				pipeId: PIPE_ID,
				fields: fieldsForAPI, //  Envia apenas field_id e field_value
			});

			console.log("[Pipefy Service] ✅ Card criado com sucesso");

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
		console.error("[Pipefy Service] ❌ Erro ao processar card:", error);
		return {
			success: false,
			error: true,
			message: `Erro ao processar lead: ${error.message}`,
			details: error.stack,
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
	console.log("[Pipefy Service] 📅 Atualizando card com reunião:", {
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

		// CORRIGIDO: Usar updateCardField para cada campo
		const updateMutation = `
			mutation UpdateCardField($cardId: ID!, $fieldId: ID!, $newValue: [UndefinedInput]) {
				updateCardField(input: { 
				card_id: $cardId, 
				field_id: $fieldId, 
				new_value: $newValue 
				}) {
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
		if (fieldMapping.link_reuniao && meetingLink) {
			fieldsToUpdate.push({
				field_id: fieldMapping.link_reuniao.id,
				field_type: fieldMapping.link_reuniao.type,
				field_value: meetingLink,
			});
		}

		// Data da reunião
		if (fieldMapping.data_reuniao && meetingDatetime) {
			fieldsToUpdate.push({
				field_id: fieldMapping.data_reuniao.id,
				field_type: fieldMapping.data_reuniao.type,
				field_value: meetingDatetime,
			});
		}

		if (fieldsToUpdate.length === 0) {
			console.warn(
				"[Pipefy Service] ⚠️ Nenhum campo de reunião encontrado no pipe"
			);
			return {
				success: true,
				card_id: cardId,
				message: "Card não possui campos de reunião configurados",
				meeting_link: meetingLink,
				meeting_datetime: meetingDatetime,
			};
		}

		// Atualizar cada campo separadamente
		let lastResult = null;
		for (const field of fieldsToUpdate) {
			console.log(
				`[Pipefy Service] Atualizando campo ${field.field_id} (tipo: ${field.field_type})...`
			);

			try {
				const formattedValue = formatFieldValue(
					field.field_value,
					field.field_type
				);

				lastResult = await pipefyGraphQLRequest(updateMutation, {
					cardId,
					fieldId: field.field_id,
					newValue: formattedValue,
				});

				console.log(`[Pipefy Service] ✓ Campo ${field.field_id} atualizado`);
			} catch (error) {
				console.error(
					`[Pipefy Service] ✗ Erro ao atualizar campo ${field.field_id}:`,
					error.message
				);
			}
		}

		console.log("[Pipefy Service] ✅ Card atualizado com reunião");

		return {
			success: true,
			card_id: lastResult?.updateCardField?.card?.id || cardId,
			message: "Card atualizado com informações da reunião",
			meeting_link: meetingLink,
			meeting_datetime: meetingDatetime,
			updated_at:
				lastResult?.updateCardField?.card?.updated_at ||
				new Date().toISOString(),
		};
	} catch (error) {
		console.error("[Pipefy Service] ❌ Erro ao atualizar card:", error);
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
