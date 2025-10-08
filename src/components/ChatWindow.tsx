import { useEffect, useState, useRef } from 'react';
import ChatInput from './ChatInput';
import { supabase } from '../utils/supabaseClient';
import type { Message } from '../hooks/types';
import { RealtimeChannel } from '@supabase/supabase-js';
import '../styles/chatWindow.css';

// Utility functions moved to top
const isImageUrl = (text: string) => {
  if (!text) return false;
  if ((window as any).__imageUrlCache?.[text]) {
    return (window as any).__imageUrlCache[text];
  }
  
  const isImage = text.includes('storage.googleapis.com') || 
                 text.includes('supabase.co') ||
                 /\.(jpg|jpeg|png|gif|webp)$/i.test(text);
  
  if (!(window as any).__imageUrlCache) {
    (window as any).__imageUrlCache = {};
  }
  (window as any).__imageUrlCache[text] = isImage;
  
  return isImage;
};

const preloadImage = (url: string) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

// Extender la interfaz Message para incluir propiedades opcionales
interface ExtendedMessage extends Message {
  id?: string;
  temp?: boolean;
}

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

const Message: React.FC<{ message: Message; index: number }> = ({ message, index }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const isImage = isImageUrl(message.text);

  useEffect(() => {
    if (isImage) {
      const loadImage = async () => {
        try {
          await preloadImage(message.text);
          setIsLoaded(true);
        } catch (error) {
          console.error('Error loading image:', error);
          setIsLoaded(true); // Mostrar fallback en caso de error
        }
      };
      loadImage();
    }
  }, [message.text, isImage]);

  return (
    <div key={index}>
      <div className={`message-bubble ${
        message.role === 'user' ? 'user' : message.role === 'agent' ? 'agent' : 'bot'
      }`}>
        <strong>
          {message.role === 'user' ? 'Usuario' : message.role === 'agent' ? 'Agente' : 'Bot'}
        </strong>
        {isImage ? (
          <div className="image-container">
            {!isLoaded && <div className="image-loader" />}
            <img
              src={message.text}
              alt="Imagen compartida"
              className={`chat-image ${isLoaded ? 'loaded' : ''}`}
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = '/path/to/fallback-image.png';
              }}
              onClick={() => window.open(message.text, '_blank')}
            />
          </div>
        ) : (
          <span>{message.text}</span>
        )}
      </div>
    </div>
  );
};

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
  const [liveMessages, setLiveMessages] = useState<ExtendedMessage[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);
  const reconnectionAttempts = useRef(0);
  const maxReconnectionAttempts = 3;
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [channelError, setChannelError] = useState<string | null>(null);

  // Inicializar con mensajes recibidos
  useEffect(() => {
    if (!initialized && messages.length > 0) {
      setLiveMessages(messages);
      setInitialized(true);
    }
  }, [messages, initialized]);

  // Función para manejar la reconexión
  const handleReconnection = async () => {
    if (reconnectionAttempts.current >= maxReconnectionAttempts) {
      setChannelError('Conexión perdida. Por favor, recarga la página.');
      return;
    }

    setIsReconnecting(true);
    reconnectionAttempts.current += 1;

    if (channelRef.current) {
      await channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    setupChannel();
  };

  // Configurar el canal de Supabase
  const setupChannel = () => {
    try {
      if (channelRef.current) {
        return; // Prevenir suscripciones múltiples
      }

      const channel = supabase.channel(`public:messages:${chatId}`);
      channelRef.current = channel;

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
            setIsReconnecting(false);
            const newMessage: ExtendedMessage = {
              role: payload.new.role,
              text: payload.new.text,
              id: payload.new.id
            };
            setLiveMessages((prev) => [...prev, newMessage]);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsReconnecting(false);
            setChannelError(null);
            reconnectionAttempts.current = 0;
          } else if (status === 'CHANNEL_ERROR') {
            setTimeout(handleReconnection, 1000);
          }
        });
    } catch (error) {
      console.error('Error al configurar el canal:', error);
      setChannelError('Error de conexión');
    }
  };

  // Suscripción a cambios en Supabase
  useEffect(() => {
    setupChannel();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
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

  // Modificar el manejo de la carga de imágenes
  const handleImageUpload = async (file: File) => {
    if (!chatId) return;

    try {
      setUploadStatus('Preparando imagen...');
      
      // Validación más estricta del archivo
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Formato de imagen no soportado. Use JPG, PNG, WEBP o GIF.');
      }

      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error('La imagen es demasiado grande. Máximo 5MB.');
      }

      // Comprimir si es necesario
      let imageToUpload = file;
      if (file.size > 1024 * 1024) {
        setUploadStatus('Comprimiendo imagen...');
        try {
          imageToUpload = await compressImage(file);
        } catch (error) {
          console.error('Error compressing image:', error);
        }
      }

      setUploadStatus('Subiendo imagen...');

      // Generar nombre de archivo seguro
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(7);
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const safeFileName = `${timestamp}_${randomString}.${extension}`;
      const filePath = `${chatId}/${safeFileName}`;

      // Subir archivo al bucket correcto
      const { data, error } = await supabase.storage
        .from('chat_uploads')
        .upload(filePath, imageToUpload, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        throw new Error(error.message);
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('chat_uploads')
        .getPublicUrl(filePath);

      if (!urlData.publicUrl) {
        throw new Error('No se pudo obtener la URL de la imagen');
      }

      // Verificar que la imagen sea accesible
      await preloadImage(urlData.publicUrl);

      // Enviar mensaje con la URL de la imagen
      onSendMessage(urlData.publicUrl);
      setUploadStatus('');

    } catch (error: any) {
      console.error('Error uploading image:', error);
      setUploadStatus('');
      
      // Mensajes de error más específicos
      let errorMessage = 'No se pudo subir la imagen. Por favor intente nuevamente.';
      if (error.message.includes('duplicate')) {
        errorMessage = 'Ya existe una imagen con el mismo nombre. Intente nuevamente.';
      } else if (error.message.includes('size')) {
        errorMessage = 'La imagen es demasiado grande. Máximo 5MB.';
      } else if (error.message.includes('permission')) {
        errorMessage = 'Error de permisos al subir la imagen.';
      }
      
      alert(errorMessage);
    }
  };

  // Actualizar la función de compresión de imágenes
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Mantener relación de aspecto y limitar tamaño máximo
          const maxDimension = 1200;
          if (width > height && width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          } else if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo crear el contexto del canvas'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Usar el mismo tipo de archivo que el original si es posible
          const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const quality = mimeType === 'image/jpeg' ? 0.8 : undefined;

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('No se pudo comprimir la imagen'));
                return;
              }
              resolve(new File([blob], file.name, {
                type: mimeType,
                lastModified: Date.now(),
              }));
            },
            mimeType,
            quality
          );
        };
        img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
      reader.readAsDataURL(file);
    });
  };

  // Move these utility functions outside of the ChatWindow component
  const isImageUrl = (text: string) => {
    if (!text) return false;
    if ((window as any).__imageUrlCache?.[text]) {
      return (window as any).__imageUrlCache[text];
    }
    
    const isImage = text.includes('storage.googleapis.com') || 
                   text.includes('supabase.co') ||
                   /\.(jpg|jpeg|png|gif|webp)$/i.test(text);
    
    if (!(window as any).__imageUrlCache) {
      (window as any).__imageUrlCache = {};
    }
    (window as any).__imageUrlCache[text] = isImage;
    
    return isImage;
  };

  const preloadImage = (url: string) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  return (
    <div className="chat-window-center-container">
      {channelError && (
        <div className="channel-error-banner">
          {channelError}
        </div>
      )}
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
              {liveMessages.map((msg, index) => (
                <Message key={index} message={msg} index={index} />
              ))}
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
                <div className={`chat-input${showSobranteWaitingLoader ? ' chat-input-disabled' : ''}`}>
                  <ChatInput 
                    onSendMessage={onSendMessage}
                    onImageUpload={handleImageUpload}
                    isReconnecting={isReconnecting}
                    uploadStatus={uploadStatus}
                  />
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