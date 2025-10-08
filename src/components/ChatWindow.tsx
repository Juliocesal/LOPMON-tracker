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

  const showYesNoOptions =
    lastBotMessage && lastBotMessage.includes('es correcto?');

  const showSobranteWaitingLoader = liveMessages.some(
    (msg) =>
      msg.role === 'bot' &&
      (msg.text.includes('Perfecto. Un agente se conectará en breve para ayudarte.') ||
       msg.text.includes('Un agente se conectará contigo en breve.')) &&
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

  // Optimizar la detección de imágenes y manejo de carga
  const isImageUrl = (text: string) => {
    if (!text) return false;
    // Cachear el resultado para evitar múltiples comprobaciones
    if ((window as any).__imageUrlCache?.[text]) {
      return (window as any).__imageUrlCache[text];
    }
    
    const isImage = text.includes('storage.googleapis.com') || 
                   text.includes('supabase.co') ||
                   /\.(jpg|jpeg|png|gif|webp)$/i.test(text);
    
    // Guardar en caché
    if (!(window as any).__imageUrlCache) {
      (window as any).__imageUrlCache = {};
    }
    (window as any).__imageUrlCache[text] = isImage;
    
    return isImage;
  };

  // Función para pre-cargar imágenes
  const preloadImage = (url: string) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  // Renderizar mensajes con optimización de imágenes
  const renderMessage = (msg: Message, index: number) => {
    const isImage = isImageUrl(msg.text);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
      if (isImage) {
        const loadImage = async () => {
          try {
            await preloadImage(msg.text);
            setIsLoaded(true);
          } catch (error) {
            console.error('Error loading image:', error);
            setIsLoaded(true); // Mostrar fallback en caso de error
          }
        };
        loadImage();
      }
    }, [msg.text, isImage]);

    return (
      <div key={index}>
        <div className={`message-bubble ${
          msg.role === 'user' ? 'user' : msg.role === 'agent' ? 'agent' : 'bot'
        }`}>
          <strong>
            {msg.role === 'user' ? 'Usuario' : msg.role === 'agent' ? 'Agente' : 'Bot'}
          </strong>
          {isImage ? (
            <div className="image-container">
              {!isLoaded && <div className="image-loader" />}
              <img
                src={msg.text}
                alt="Imagen compartida"
                className={`chat-image ${isLoaded ? 'loaded' : ''}`}
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = '/path/to/fallback-image.png';
                }}
                onClick={() => window.open(msg.text, '_blank')}
              />
            </div>
          ) : (
            <span>{msg.text}</span>
          )}
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
              {liveMessages.map((msg, index) => renderMessage(msg, index))}
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
              {showYesNoOptions ? (
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

