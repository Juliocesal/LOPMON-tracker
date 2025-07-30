import { useEffect, useState, useRef } from 'react';
import ChatInput from './ChatInput';
import { supabase } from '../utils/supabaseClient';
import { Message } from '../hooks/types';
import '../styles/chatWindow.css';

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  chatId: string;
  isChatClosed: boolean;
  agentConnected?: boolean;
  agentName?: string;
  loading?: boolean; // NUEVO
  onNewChat?: () => void; // Nueva función para crear nuevo chat
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  onSendMessage,
  chatId,
  isChatClosed,
  agentConnected = false,
  agentName = '',
  loading = false, // NUEVO
  onNewChat // Nueva función para crear nuevo chat
}) => {
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Ref para el scroll automático
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

  // Inicializar con mensajes recibidos
  useEffect(() => {
    if (!initialized && messages.length > 0) {
      setLiveMessages(messages);
      setInitialized(true);
    }
  }, [messages, initialized]);

  // Suscripción a cambios en Supabase
  useEffect(() => {
    const channel = supabase.channel(`public:messages:${chatId}`);

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload: any) => {
          const newMessage: Message = {
            role: payload.new.role,
            text: payload.new.text,
          };
          setLiveMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [chatId]);

  // Scroll automático al último mensaje
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveMessages]);

  // Para mostrar opciones dinámicas
  const lastBotMessage = liveMessages.length > 0
    ? liveMessages.filter(m => m.role === 'bot').slice(-1)[0]?.text
    : '';

  const showTypeOptions =
    lastBotMessage &&
    (
      lastBotMessage.includes('¿Qué problema tienes con el tote?') ||
      lastBotMessage.includes('Por favor, selecciona el tipo de problema')
    );

  const showYesNoOptions =
    lastBotMessage &&
    (
      lastBotMessage.includes('está correctamente escrita?') ||
      lastBotMessage.includes('es correcto?') ||
      lastBotMessage.includes('¿Los datos del reporte están correctos?')
    );

  const showFaltanteCorrectionOptions =
    lastBotMessage &&
    lastBotMessage.includes('¿Qué campo necesitas corregir?') &&
    liveMessages.some(msg => msg.text.includes('reporte de FALTANTE'));

  const showSobranteCorrectionOptions =
    lastBotMessage &&
    lastBotMessage.includes('¿Qué campo necesitas corregir?') &&
    liveMessages.some(msg => msg.text.includes('reporte de SOBRANTE'));

  const showSobranteWaitingLoader = liveMessages.some(
    (msg) =>
      msg.role === 'bot' &&
      msg.text.includes('Perfecto. Tu reporte ha sido registrado y transferido a un agente. Por favor, espera mientras se conecta un agente para ayudarte.') &&
      !agentConnected
  );

  const handleOptionClick = (option: string) => {
    onSendMessage(option);
  };

  // Determinar el estado actual del header
  const getHeaderState = () => {
    if (loading) {
      return 'loading';
    }
    if (isChatClosed) {
      return 'closed';
    }
    if (agentConnected && agentName) {
      return 'connected';
    }
    if (showSobranteWaitingLoader) {
      return 'waiting';
    }
    return 'processing';
  };

  const renderHeaderContent = () => {
    const state = getHeaderState();
    let icon, statusClass, extra = null;
    switch (state) {
      case 'loading':
        icon = <div className="spinner"></div>;
        statusClass = 'loading';
        break;
      case 'connected':
        icon = <span>👤</span>;
        statusClass = 'connected';
        break;
      case 'waiting':
        icon = <span>⏳</span>;
        statusClass = 'waiting';
        extra = <div className="pulse-ring"></div>;
        break;
      case 'closed':
        icon = <span>�</span>;
        statusClass = 'closed';
        break;
      default:
        icon = <><div className="processing-spinner"></div><span>🤖</span></>;
        statusClass = 'processing';
        break;
    }
    return (
      <div className="header-content header-content-right">
        <div className="header-text">
          {state === 'loading' && <><div className="header-title">Iniciando Sesión</div><div className="header-subtitle">Cargando interfaz de chat...</div></>}
          {state === 'connected' && <><div className="header-title">Agente Conectado</div><div className="header-subtitle">{agentName} • En línea</div></>}
          {state === 'waiting' && <><div className="header-title">Conectando Agente</div><div className="header-subtitle">Un agente se unirá en breve...</div></>}
          {state === 'closed' && <><div className="header-title">Sesión Finalizada</div><div className="header-subtitle">El chat ha sido cerrado por el agente</div></>}
          {state === 'processing' && <><div className="header-title">Asistente Virtual</div><div className="header-subtitle">Procesando su consulta...</div></>}
        </div>
        <div className={`header-icon ${statusClass}`} style={{ position: 'relative', marginLeft: 'auto' }}>
          {icon}
          <div className={`status-indicator ${statusClass}`}></div>
          {extra}
        </div>
      </div>
    );
  };

  return (
    <div className="chat-window-center-container">
      <div className="chat-window">
        {/* Header profesional mejorado */}
        <div className={`agent-header-pro ${getHeaderState()}`}>
          {renderHeaderContent()}
        </div>
        {/* Mensajes */}
        <div className="messages-container">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div className="loader-bubble" />
              <div style={{ marginTop: '1rem', color: '#555', fontWeight: 'bold' }}>Cargando chat...</div>
            </div>
          ) : (
            <>
              {liveMessages.map((msg, index) => {
                const isTransferMessage =
                  msg.role === 'bot' &&
                  msg.text.includes('Perfecto. Tu reporte ha sido registrado y transferido a un agente. Por favor, espera mientras se conecta un agente para ayudarte.');
                return (
                  <div key={index}>
                    <div
                      className={`message-bubble ${msg.role === 'user' ? 'user' : msg.role === 'agent' ? 'agent' : 'bot'}`}
                    >
                      <strong>
                        {msg.role === 'user' ? 'Usuario' : msg.role === 'agent' ? 'Agente' : 'Bot'}
                      </strong>
                      <span>{msg.text}</span>
                    </div>
                    {/* Loader justo después del mensaje de transferencia */}
                    {isTransferMessage && !agentConnected && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '16px 0' }}>
                        <div className="loader-bubble" />
                        <span style={{ fontSize: '0.95em', color: '#888', marginTop: 8 }}>
                          Esperando a que un agente se una al chat...
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Ref para hacer scroll */}
              <div ref={endOfMessagesRef}></div>
            </>
          )}
        </div>

        {/* SOLO mostrar notificación y botón aquí abajo */}
        {!loading && ( // No mostrar opciones si está cargando
          isChatClosed ? (
            <div className="options-container" style={{ flexDirection: 'column', alignItems: 'center' }}>
              <div className="chat-closed-notification">
                🔒 Este chat ha sido cerrado por el agente.
              </div>
              <button
                onClick={() => onNewChat ? onNewChat() : window.location.reload()}
                className="new-chat-button"
              >
                Nuevo chat
              </button>
            </div>
          ) : (
            <>
              {showTypeOptions ? (
                <div className="options-container">
                  <button
                    className="option-button blue"
                    onClick={() => handleOptionClick('Me falta material')}
                    disabled={showSobranteWaitingLoader}
                    style={showSobranteWaitingLoader ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                  >
                    Me falta material
                  </button>
                  <button
                    className="option-button green"
                    onClick={() => handleOptionClick('Me sobro material')}
                    disabled={showSobranteWaitingLoader}
                    style={showSobranteWaitingLoader ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                  >
                    Me sobro material
                  </button>
                </div>
              ) : showYesNoOptions ? (
                <div className="options-container">
                  <button
                    className="option-button blue"
                    onClick={() => handleOptionClick('Sí')}
                    disabled={showSobranteWaitingLoader}
                    style={showSobranteWaitingLoader ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                  >
                    Sí
                  </button>
                  <button
                    className="option-button red"
                    onClick={() => handleOptionClick('No')}
                    disabled={showSobranteWaitingLoader}
                    style={showSobranteWaitingLoader ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                  >
                    No
                  </button>
                </div>
              ) : showFaltanteCorrectionOptions ? (
                <div className="options-container">
                  <button
                    className="option-button blue"
                    onClick={() => handleOptionClick('Usuario')}
                    disabled={showSobranteWaitingLoader}
                    style={showSobranteWaitingLoader ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                  >
                    Usuario
                  </button>
                  <button
                    className="option-button green"
                    onClick={() => handleOptionClick('Ubicación')}
                    disabled={showSobranteWaitingLoader}
                    style={showSobranteWaitingLoader ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                  >
                    Ubicación
                  </button>
                  <button
                    className="option-button orange"
                    onClick={() => handleOptionClick('Stock ID')}
                    disabled={showSobranteWaitingLoader}
                    style={showSobranteWaitingLoader ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                  >
                    Stock ID
                  </button>
                  <button
                    className="option-button purple"
                    onClick={() => handleOptionClick('Tote')}
                    disabled={showSobranteWaitingLoader}
                    style={showSobranteWaitingLoader ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                  >
                    Tote
                  </button>
                </div>
              ) : showSobranteCorrectionOptions ? (
                <div className="options-container">
                  <button
                    className="option-button blue"
                    onClick={() => handleOptionClick('Usuario')}
                    disabled={showSobranteWaitingLoader}
                    style={showSobranteWaitingLoader ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                  >
                    Usuario
                  </button>
                  <button
                    className="option-button green"
                    onClick={() => handleOptionClick('Tote')}
                    disabled={showSobranteWaitingLoader}
                    style={showSobranteWaitingLoader ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                  >
                    Tote
                  </button>
                  <button
                    className="option-button orange"
                    onClick={() => handleOptionClick('Stock ID')}
                    disabled={showSobranteWaitingLoader}
                    style={showSobranteWaitingLoader ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                  >
                    Stock ID
                  </button>
                </div>
              ) : (
                <div
                  className={`chat-input${showSobranteWaitingLoader ? ' chat-input-disabled' : ''}`}
                  style={showSobranteWaitingLoader ? { pointerEvents: 'none', opacity: 0.6, background: '#e5e7eb' } : {}}
                >
                  <ChatInput onSendMessage={onSendMessage} />
                  {showSobranteWaitingLoader && (
                    <div className="chat-input-blocker"></div>
                  )}
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
