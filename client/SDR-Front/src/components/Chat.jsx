import { useState, useEffect, useRef } from 'react';
import { 
  getSession, 
  updateConversationId, 
  saveMessages, 
  loadMessages,
  clearSession,
  renewActivity
} from '../utils/session';
import { sendMessage } from '../utils/api';
import './Chat.css';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Inicializar sessão e carregar mensagens
  useEffect(() => {
    const currentSession = getSession();
    setSession(currentSession);
    
    const storedMessages = loadMessages();
    if (storedMessages.length > 0) {
      setMessages(storedMessages);
    } else {
      // Mensagem inicial de boas-vindas
      setMessages([{
        id: 'welcome',
        type: 'agent',
        text: 'Olá! Sou o assistente SDR da Verzel. Como posso ajudá-lo hoje?',
        timestamp: new Date().toISOString()
      }]);
    }
  }, []);

  // Salvar mensagens sempre que mudarem
  useEffect(() => {
    if (messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages]);

  // Scroll automático para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Renovar atividade periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      renewActivity();
    }, 60000); // A cada 1 minuto

    return () => clearInterval(interval);
  }, []);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    // Adiciona mensagem do usuário
    const userMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      text,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      // Envia para o backend
      const response = await sendMessage(text, session?.conversationId);
      
      // Atualiza conversation_id se for a primeira mensagem
      if (response.conversation_id && !session?.conversationId) {
        updateConversationId(response.conversation_id);
        setSession(prev => ({ ...prev, conversationId: response.conversation_id }));
      }

      // Adiciona resposta do agente
      const agentMessage = {
        id: `agent_${Date.now()}`,
        type: 'agent',
        text: response.message,
        timestamp: response.timestamp || new Date().toISOString()
      };

      setMessages(prev => [...prev, agentMessage]);
      
    } catch (err) {
      setError(err.message || 'Erro ao enviar mensagem');
      
      // Adiciona mensagem de erro
      const errorMessage = {
        id: `error_${Date.now()}`,
        type: 'error',
        text: `❌ ${err.message || 'Erro de conexão. Tente novamente.'}`,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setInputValue('');
      inputRef.current?.blur();
    }
  };

  const handleNewChat = () => {
    if (window.confirm('Deseja iniciar uma nova conversa? O histórico atual será perdido.')) {
      clearSession();
      setMessages([{
        id: 'welcome',
        type: 'agent',
        text: 'Olá! Sou o assistente SDR da Verzel. Como posso ajudá-lo hoje?',
        timestamp: new Date().toISOString()
      }]);
      const newSession = getSession();
      setSession(newSession);
    }
  };

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <div className="header-content">
          <div className="header-title">
            <h1>🤖 SDR Verzel</h1>
            <p>Assistente Virtual</p>
          </div>
          <button 
            className="btn-new-chat"
            onClick={handleNewChat}
            aria-label="Iniciar nova conversa"
            title="Nova conversa"
          >
            ✨ Nova Conversa
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="chat-messages" role="log" aria-live="polite" aria-atomic="false">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`message message-${msg.type}`}
            role="article"
          >
            <div className="message-content">
              {msg.text}
            </div>
            <div className="message-time">
              {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message message-agent">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="chat-input-container">
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        
        <div className="chat-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            className="chat-input"
            placeholder="Digite sua mensagem..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            aria-label="Campo de mensagem"
            autoComplete="off"
          />
          <button
            className="btn-send"
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            aria-label="Enviar mensagem"
            title="Enviar (Enter)"
          >
            {isLoading ? '⏳' : '📤'}
          </button>
        </div>
        
        <div className="input-hint">
          <small>Pressione <kbd>Enter</kbd> para enviar • <kbd>Esc</kbd> para limpar</small>
        </div>
      </div>
    </div>
  );
}
