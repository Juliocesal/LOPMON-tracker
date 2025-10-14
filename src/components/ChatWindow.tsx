import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import ChatInput from './ChatInput';
import { supabase } from '../utils/supabaseClient';
import type { Message } from '../hooks/types';
import { RealtimeChannel, REALTIME_CHANNEL_STATES, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';  
import '../styles/chatWindow.css';
import ImageViewerModal from './ImageViewerModal';
import '../styles/imageViewer.css';

// Utility functions moved to top
const isImageUrl = (text: string) => {
  if (!text) return false;
  
  // Use a more robust cache mechanism
  if (!window.__imageUrlCache) {
    window.__imageUrlCache = {};
  }
  
  if (window.__imageUrlCache[text] !== undefined) {
    return window.__imageUrlCache[text];
  }
  
  const isImage = text.includes('storage.googleapis.com') || 
                 text.includes('supabase.co') ||
                 /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(text.split('?')[0]); // Better URL parsing
  
  window.__imageUrlCache[text] = isImage;
  
  return isImage;
};

// Add type declaration for window cache
declare global {
  interface Window {
    __imageUrlCache?: Record<string, boolean>;
  }
}

const preloadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
};

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  chatId: string;
  isChatClosed: boolean;
  agentConnected?: boolean;
  agentName?: string;
  loading?: boolean;
  onNewChat?: () => void;
  agentDisconnected: boolean;
}

interface MessageProps {
  message: Message;  // Changed from ExtendedMessage to Message
  index: number;
  onImageClick: (imageUrl: string) => void;
}

const Message: React.FC<MessageProps> = ({ message, index, onImageClick }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const isImage = isImageUrl(message.text);

  useEffect(() => {
    if (isImage && !hasError) {
      const loadImage = async () => {
        try {
          await preloadImage(message.text);
          setIsLoaded(true);
        } catch (error) {
          console.error('Error loading image:', error);
          setHasError(true);
          setIsLoaded(true); // Mostrar fallback en caso de error
        }
      };
      loadImage();
    }
  }, [message.text, isImage, hasError]);

  return (
    <div key={message.id || index} className="message-wrapper">
      <div className={`message-bubble ${
        message.role === 'user' ? 'user' : message.role === 'agent' ? 'agent' : 'bot'
      }`}>
        <strong>
          {message.role === 'user' ? 'Usuario' : message.role === 'agent' ? 'Agente' : 'Bot'}
        </strong>
        {isImage && !hasError ? (
          <div className="image-container">
            {!isLoaded && <div className="image-loader" />}
            <img
              src={message.text}
              alt="Imagen compartida"
              className={`chat-image ${isLoaded ? 'loaded' : ''}`}
              loading="lazy"
              onError={() => {
                setHasError(true);
                setIsLoaded(true);
              }}
              onClick={() => onImageClick(message.text)}
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
  loading = false,
  onNewChat,
  agentDisconnected = false,
}) => {
  const [liveMessages, setLiveMessages] = useState<Message[]>([]); // Changed from ExtendedMessage to Message
  const [initialized, setInitialized] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);
  const reconnectionAttempts = useRef(0);
  const maxReconnectionAttempts = 3;
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [channelError, setChannelError] = useState<string | null>(null);
  const reconnectIntervalRef = useRef<number | null>(null);
  const sessionKey = `chat_session_${chatId}`;
  const [isClosedLocal, setIsClosedLocal] = useState(isChatClosed);
  const lastMessageIdRef = useRef<string | null>(null);

  // Función para cargar mensajes perdidos durante la desconexión
  const fetchMissedMessages = useCallback(async () => {
    if (!chatId) return;

    try {
      let query = supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      // Si tenemos un último mensaje conocido, cargar solo los más recientes
      if (lastMessageIdRef.current) {
        query = query.gt('id', lastMessageIdRef.current);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        const newMessages: Message[] = data.map(msg => ({
          id: msg.id,
          role: msg.role,
          text: msg.text,
          created_at: msg.created_at
        }));

        setLiveMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const filteredNew = newMessages.filter(msg => !existingIds.has(msg.id));
          
          if (filteredNew.length === 0) return prev;
          
          const combined = [...prev, ...filteredNew];
          // Ordenar por fecha de creación
          combined.sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateA - dateB;
          });
          
          return combined;
        });

        // Actualizar el último ID conocido
        const lastMessage = data[data.length - 1];
        if (lastMessage?.id) {
          lastMessageIdRef.current = lastMessage.id;
        }
      }
    } catch (error) {
      console.error('Error fetching missed messages:', error);
    }
  }, [chatId]);

  // Guardar estado del chat en localStorage
  const persistChatState = useCallback(() => {
    const state = {
      messages: liveMessages,
      initialized,
      agentConnected,
      agentName,
      lastUpdate: Date.now(),
      lastMessageId: lastMessageIdRef.current
    };
    try {
      localStorage.setItem(sessionKey, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [liveMessages, initialized, agentConnected, agentName, sessionKey]);

  // Restaurar estado del chat
  useEffect(() => {
    const savedState = localStorage.getItem(sessionKey);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        // Solo restaurar si el estado guardado es reciente (menos de 24 horas)
        if (Date.now() - state.lastUpdate < 24 * 60 * 60 * 1000) {
          setLiveMessages(state.messages);
          setInitialized(true);
          if (state.lastMessageId) {
            lastMessageIdRef.current = state.lastMessageId;
          }
        } else {
          localStorage.removeItem(sessionKey);
        }
      } catch (error) {
        console.error('Error restoring chat state:', error);
      }
    }
  }, [chatId, sessionKey]);

  // Persistir cambios
  useEffect(() => {
    persistChatState();
  }, [persistChatState]);

  // Función para manejar la reconexión
  const handleReconnection = useCallback(async () => {
    if (reconnectionAttempts.current >= maxReconnectionAttempts) {
      setChannelError('Conexión perdida. Por favor, espera un momento.');
      return;
    }

    setIsReconnecting(true);
    reconnectionAttempts.current += 1;

    if (channelRef.current) {
      await channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    // Cargar mensajes perdidos antes de reconectar el canal
    await fetchMissedMessages();
    setupChannel();
  }, [maxReconnectionAttempts, fetchMissedMessages]);

  
  // Modificar la función checkChatStatus para incluir ambos estados
  const checkChatStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('status')
        .eq('id', chatId)
        .single();

      if (error) throw error;
      
      // Verificar si el estado es closed o resolved
      if (data?.status === 'closed' || data?.status === 'resolved') {
        localStorage.setItem(`chat_closed_${chatId}`, 'true');
        localStorage.setItem(`chat_status_${chatId}`, data.status);
        window.dispatchEvent(new Event('storage'));
      }
    } catch (error) {
      console.error('Error checking chat status:', error);
    }
  }, [chatId]);

  const setupChannel = useCallback(() => {
    try {
      // Prevenir múltiples suscripciones
      if (channelRef.current) {
        const currentState = channelRef.current.state;
        // Si el canal ya está suscrito o en proceso de suscripción, salir
        if (currentState === REALTIME_CHANNEL_STATES.joined || 
            currentState === REALTIME_CHANNEL_STATES.joining) {
          console.log('Canal ya activo o uniéndose, evitando suscripción duplicada');
          return;
        }
        // Si el canal existe pero no está activo, desuscribir primero
        console.log('Limpiando canal inactivo');
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }

      console.log('Configurando nuevo canal');
      const channel = supabase.channel(`public:messages:${chatId}`, {
        config: { broadcast: { self: true } },
      });

      // Configurar handlers antes de suscribir
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
            if (payload.new) {
              const newMessage: Message = {
                role: payload.new.role,
                text: payload.new.text,
                id: payload.new.id,
                created_at: payload.new.created_at
              };

              if (newMessage.id) {
                lastMessageIdRef.current = newMessage.id;
              }

              setLiveMessages((prev) => {
                if (prev.some(msg => msg.id === newMessage.id)) {
                  return prev;
                }
                return [...prev, newMessage];
              });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chats',
            filter: `id=eq.${chatId}`,
          },
          (payload: any) => {
            if (payload.new && (payload.new.status === 'closed' || payload.new.status === 'resolved')) {
              localStorage.setItem(`chat_closed_${chatId}`, 'true');
              localStorage.setItem(`chat_status_${chatId}`, payload.new.status);
              window.dispatchEvent(new Event('storage'));
            }
          }
        );

      // Guardar referencia antes de suscribir
      channelRef.current = channel;

      // Suscribir una sola vez con manejo de estado mejorado
      const subscription = channel.subscribe(async (status) => {
        console.log('Estado de suscripción:', status);
        
        if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
          console.log('Canal suscrito exitosamente');
          setIsReconnecting(false);
          setChannelError(null);
          reconnectionAttempts.current = 0;
          await Promise.all([
            checkChatStatus(),
            fetchMissedMessages()
          ]);
        } else if (status === REALTIME_SUBSCRIBE_STATES.CLOSED || 
                   status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR) {
          console.log('Error en canal, iniciando reconexión');
          handleReconnection();
        }
      });

      return () => {
        subscription.unsubscribe();
      };

    } catch (error) {
      console.error('Error al configurar el canal:', error);
      handleReconnection();
    }
  }, [chatId, handleReconnection, checkChatStatus, fetchMissedMessages]);

  // Modificar el useEffect que maneja la inicialización del canal
  useEffect(() => {
    if (!chatId) return;
    
    console.log('Iniciando configuración del chat:', chatId);
    
    let mounted = true;
    let cleanup: (() => void) | undefined;

    const initializeChat = async () => {
      try {
        if (!mounted) return;
        
        // Limpiar canal existente si hay
        if (channelRef.current) {
          console.log('Limpiando canal previo');
          channelRef.current.unsubscribe();
          channelRef.current = null;
        }

        // Cargar mensajes antes de establecer el canal
        await fetchMissedMessages();
        
        // Configurar nuevo canal
        if (mounted) {
          cleanup = setupChannel();
        }
      } catch (error) {
        console.error('Error en inicialización:', error);
      }
    };

    initializeChat();

    return () => {
      mounted = false;
      if (cleanup) cleanup();
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [chatId, setupChannel, fetchMissedMessages]);

  // Inicializar canal y mensajes
  useEffect(() => {
    if (!chatId) {
      // Si no hay chatId, limpiar todo y salir
      const cleanup = () => {
        if (channelRef.current) {
          channelRef.current.unsubscribe();
          channelRef.current = null;
        }
        if (reconnectIntervalRef.current) {
          clearInterval(reconnectIntervalRef.current);
          reconnectIntervalRef.current = null;
        }
        reconnectionAttempts.current = 0;
        setIsReconnecting(false);
        setChannelError(null);
      };
      cleanup();
      return;
    }

    // Función de limpieza completa
    const cleanupChannel = () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      if (reconnectIntervalRef.current) {
        clearInterval(reconnectIntervalRef.current);
        reconnectIntervalRef.current = null;
      }
      reconnectionAttempts.current = 0;
      setIsReconnecting(false);
      setChannelError(null);
    };

    // Limpiar cualquier canal previo ANTES de crear el nuevo
    cleanupChannel();

    // Inicializar mensajes y canal
    const initialize = async () => {
      await fetchMissedMessages();
      setupChannel();
    };

    initialize();

    // Cleanup al desmontar o al cambiar chatId
    return () => {
      cleanupChannel();
    };
  }, [chatId, setupChannel, fetchMissedMessages]);

  // Inicializar con mensajes recibidos
  useEffect(() => {
    if (!initialized && messages.length > 0) {
      setLiveMessages(messages);
      setInitialized(true);
    }
  }, [messages, initialized]);

  // Añadir un efecto para mantener los mensajes sincronizados
  useEffect(() => {
    if (initialized && messages.length > 0) {
      setLiveMessages(prevMessages => {
        const existingIds = new Set(prevMessages.map(m => m.id));
        const newMessages = messages.filter(msg => !existingIds.has(msg.id));
        return [...prevMessages, ...newMessages];
      });
    }
  }, [messages]);

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
      (msg.text.includes('Perfecto. Un Exception se conectará en breve para ayudarte.') ||
       msg.text.includes('Un Exception se conectará contigo en breve.')) &&
      !agentConnected
  );
  
  const handleOptionClick = (option: string) => {
    onSendMessage(option);
  };

  // Determinar el estado actual del header
  const getHeaderState = useCallback(() => {
    // Obtener status guardado en localStorage
    const savedStatus = localStorage.getItem(`chat_status_${chatId}`);

    if (loading) {
      return 'loading';
    }
    if (savedStatus === 'closed' || savedStatus === 'resolved' || isChatClosed) {
      return 'closed';
    }
    if (agentConnected) {
      return agentDisconnected ? 'agent_disconnected' : 'connected';
    }
    if (showSobranteWaitingLoader) {
      return 'waiting';
    }
    return 'processing';
  }, [loading, agentConnected, agentDisconnected, showSobranteWaitingLoader, chatId, isChatClosed]);

  const renderHeaderContent = useCallback(() => {
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
        icon = <span>🔒</span>;
        statusClass = 'closed';
        break;
      case 'agent_disconnected':
        icon = <span>👤</span>;
        statusClass = 'disconnected';
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
          {state === 'waiting' && <><div className="header-title">Conectando Exception</div><div className="header-subtitle">Un Exception se unirá en breve...</div></>}
          {state === 'closed' && <><div className="header-title">Sesión Finalizada</div><div className="header-subtitle">El chat ha sido cerrado por el agente</div></>}
          {state === 'processing' && <><div className="header-title">Asistente Virtual</div><div className="header-subtitle">Procesando su consulta...</div></>}
          {state === 'agent_disconnected' && 
            <><div className="header-title">Agente Desconectado</div>
            <div className="header-subtitle">{agentName} • Fuera de línea</div></>}
        </div>
        <div className={`header-icon ${statusClass}`} style={{ position: 'relative', marginLeft: 'auto' }}>
          {icon}
          <div className={`status-indicator ${statusClass}`}></div>
          {extra}
        </div>
      </div>
    );
  }, [getHeaderState, agentName]);

  // Actualizar la función de compresión de imágenes
  const compressImage = useCallback(async (file: File): Promise<File> => {
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
          const quality = mimeType === 'image/jpeg' ? 0.8 : 0.9;

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
  }, []);

  // Modificar el manejo de la carga de imágenes
  const handleImageUpload = useCallback(async (file: File) => {
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
          // Continuar con el archivo original si la compresión falla
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
      const { error: uploadError } = await supabase.storage
        .from('chat_uploads')
        .upload(filePath, imageToUpload, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(uploadError.message);
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
  }, [chatId, compressImage, onSendMessage]);

  // Add this function before the return statement
  const handleImageClick = (clickedImage: string) => {
    const images = liveMessages
      .filter(msg => isImageUrl(msg.text))
      .map(msg => msg.text);
    const index = images.indexOf(clickedImage);
    setViewerImages(images);
    setCurrentImageIndex(index);
    setIsImageViewerOpen(true);
  };

  // Modificar el useEffect que maneja el estado closed
  useEffect(() => {
    if (isChatClosed) {
      localStorage.setItem(`chat_closed_${chatId}`, 'true');
    }
    
    const handleStorageChange = () => {
      const isClosed = localStorage.getItem(`chat_closed_${chatId}`);
      if (isClosed === 'true') {
        setLiveMessages(prev => [...prev]); // Forzar re-render
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Verificar estado inicial
    checkChatStatus();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [chatId, isChatClosed, checkChatStatus]);

  useEffect(() => {
  // Se dispara cuando cambia la prop
  setIsClosedLocal(isChatClosed);
}, [isChatClosed]);

// Manejar cambios desde Supabase o localStorage
useEffect(() => {
  const handleStorageChange = () => {
    const closed = localStorage.getItem(`chat_closed_${chatId}`);
    const status = localStorage.getItem(`chat_status_${chatId}`);
    if (closed === 'true' || status === 'resolved') {
      setIsClosedLocal(true);
    }
  };

  window.addEventListener('storage', handleStorageChange);

  return () => window.removeEventListener('storage', handleStorageChange);
}, [chatId]);

const isActuallyClosed = useMemo(() => {
  return isClosedLocal;
}, [isClosedLocal]);



  // Modificar el mensaje mostrado según el estado
  const getClosedMessage = useCallback(() => {
    const status = localStorage.getItem(`chat_status_${chatId}`);
    return status === 'resolved' 
      ? '🔒 Este chat ha sido resuelto y cerrado.'
      : '🔒 Este chat ha sido cerrado por el agente.';
  }, [chatId]);

  // 1. Mover clearEntireAppState aquí arriba, antes de handleNewChat
  const clearEntireAppState = useCallback(() => {
    // Limpiar TODOS los items de localStorage relacionados con chats
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('chat_session_') || 
          key.startsWith('chat_closed_') || 
          key.startsWith('chat_status_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Limpiar estado local
    setLiveMessages([]);
    setInitialized(false);
    setIsClosedLocal(false);
    lastMessageIdRef.current = null;
    
    // Limpiar cache de imágenes
    if (window.__imageUrlCache) {
      window.__imageUrlCache = {};
    }
    
    // Desconectar canal
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    
    // Limpiar intervalos
    if (reconnectIntervalRef.current) {
      clearInterval(reconnectIntervalRef.current);
      reconnectIntervalRef.current = null;
    }
  }, []);

  // 2. Ahora handleNewChat puede usar clearEntireAppState
  const handleNewChat = useCallback(() => {
    console.log('Iniciando nuevo chat - limpiando estado completo');
    clearEntireAppState();
    
    // Marcar el chat actual como cerrado antes de crear uno nuevo
    if (chatId) {
      localStorage.setItem(`chat_closed_${chatId}`, 'true');
    }
    
    if (onNewChat) {
      onNewChat();
    }
  }, [clearEntireAppState, onNewChat, chatId]);

  // Obtener el estado del header y memorizarlo
  const currentHeaderState = useMemo(() => getHeaderState(), [getHeaderState]);

  return (
    <div className="chat-window-center-container">
      {channelError && (
        <div className="channel-error-banner">
          {channelError}
        </div>
      )}
      <div className="chat-window">
        {/* Usar currentHeaderState en vez de headerState */}
        <div className={`agent-header-pro ${currentHeaderState}`}>
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
                <Message 
                  key={msg.id || index} 
                  message={msg} 
                  index={index} 
                  onImageClick={handleImageClick}
                />
              ))}
              {/* Ref para hacer scroll */}
              <div ref={endOfMessagesRef}></div>
            </>
          )}
        </div>

        {/* SOLO mostrar notificación y botón aquí abajo */}
        {!loading && (
          isActuallyClosed ? (
            <div className="options-container" style={{ flexDirection: 'column', alignItems: 'center' }}>
              <div className="chat-closed-notification">
                {getClosedMessage()}
              </div>
              <button
                onClick={handleNewChat}
                className="new-chat-button"
              >
                Iniciar Chat Nuevo
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
      <ImageViewerModal
        images={viewerImages}
        currentIndex={currentImageIndex}
        onClose={() => setIsImageViewerOpen(false)}
        isOpen={isImageViewerOpen}
      />
    </div>
  );
};

export default ChatWindow;