// src/pages/AgentDashboard.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient'; // Asegúrate de que la ruta sea correcta
import { downloadConversation } from '../utils/downloadConversation'; // Agrega esta línea al inicio
import Loading from '../components/Loading';
import { useNotifications } from '../contexts/NotificationContext';
import NotificationSettings from '../components/NotificationSettings';
import './AgentDashboard.css'; // Asegúrate de que la ruta sea correcta
const AgentDashboard = () => {
  const [activeChats, setActiveChats] = useState<any[]>([]); // Lista de chats activos
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null); // Chat seleccionado
  const [messages, setMessages] = useState<any[]>([]); // Mensajes del chat seleccionado
  const [response, setResponse] = useState(''); // Respuesta del agente
  const [agentName, setAgentName] = useState<string>('Agente Desconocido'); // Nombre del agente
  const [loading, setLoading] = useState(true); // Loading state
  const [isTyping, setIsTyping] = useState(false); // Estado para indicar si el agente está escribiendo
  const [userTyping, setUserTyping] = useState<{[chatId: string]: boolean}>({}); // Estado para indicar si el usuario está escribiendo
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null); // Timer para el indicador de escribiendo
  const [currentTime, setCurrentTime] = useState(new Date()); // Estado para actualizar tiempo en tiempo real
  
  // Hook de notificaciones globales
  const { notifyNewChat, notifyNewMessage, settings } = useNotifications();
  
  // Función para calcular el tiempo transcurrido de forma más precisa
  const calculateElapsedTime = (createdAt: string) => {
    const createdDate = new Date(createdAt);
    const now = currentTime;
    const elapsedMilliseconds = now.getTime() - createdDate.getTime();
    
    // Asegurar que no sean valores negativos
    if (elapsedMilliseconds < 0) return '0s';
    
    const totalSeconds = Math.floor(elapsedMilliseconds / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);
    
    // Calcular los valores restantes
    const minutes = totalMinutes % 60;
    const hours = totalHours % 24;
    
    if (totalDays > 0) {
      return `${totalDays}d ${hours}h`;
    } else if (totalHours > 0) {
      return `${totalHours}h ${minutes}m`;
    } else if (totalMinutes > 0) {
      return `${totalMinutes}m`;
    } else if (totalSeconds >= 0) {
      return `${totalSeconds}s`;
    } else {
      return '0s';
    }
  };
  

  // Obtener el perfil del agente autenticado
  useEffect(() => {
    const fetchAgentProfile = async () => {
      const { data: { user } = {} } = await supabase.auth.getUser(); // Obtener el usuario autenticado
      if (!user) return;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (error) console.error('Error al cargar el perfil del agente:', error);
      else setAgentName(data?.full_name || 'Agente Desconocido');
    };

    fetchAgentProfile();
  }, []);

  // Actualizar el tiempo cada segundo para mostrar el tiempo transcurrido en vivo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Cada segundo

    return () => clearInterval(timer);
  }, []);

  // Obtener todos los chats activos o transferidos al cargar el componente
  const fetchActiveChats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .in('status', ['active', 'transferred']);
      if (error) console.error('Error al cargar los chats:', error);
      else setActiveChats(data || []);
    } catch (error) {
      console.error('Error al cargar los chats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveChats();
  }, []);

  // Suscribirse a cambios en tiempo real para nuevos chats
  useEffect(() => {
    const subscription = supabase
      .channel('public:chats')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chats',
          filter: 'status=in.(active,transferred)',
        },
        (payload) => {
          // Evitar duplicados al agregar el nuevo chat
          setActiveChats((prev) => {
            if (prev.some((chat) => chat.id === payload.new.id)) return prev;
            
            // Notificar nuevo chat
            if (settings.visualEnabled) {
              notifyNewChat(
                payload.new.id, 
                `Chat iniciado por usuario ${payload.new.user_name || 'anónimo'}`
              );
            }
            
            return [...prev, payload.new];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chats',
          filter: 'status=in.(active,transferred)',
        },
        (payload) => {
          // Actualizar chat si cambia su estado
          setActiveChats((prev) =>
            prev.map((chat) => (chat.id === payload.new.id ? payload.new : chat))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chats',
        },
        (payload) => {
          // Eliminar chat si es borrado
          setActiveChats((prev) => prev.filter((chat) => chat.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [settings.visualEnabled, notifyNewChat]);

  // Suscripción para detectar cuando el usuario está escribiendo
  useEffect(() => {
    const typingSubscription = supabase
      .channel('typing-indicators')
      .on('broadcast', { event: 'user-typing' }, (payload) => {
        const { chatId, isTyping: userIsTyping } = payload.payload;
        setUserTyping(prev => ({
          ...prev,
          [chatId]: userIsTyping
        }));
        
        // Auto-ocultar el indicador después de 3 segundos de inactividad
        if (userIsTyping) {
          setTimeout(() => {
            setUserTyping(prev => ({
              ...prev,
              [chatId]: false
            }));
          }, 3000);
        }
      })
      .subscribe();

    return () => {
      typingSubscription.unsubscribe();
    };
  }, []);

  // Cargar mensajes del chat seleccionado
  useEffect(() => {
    if (!selectedChatId) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', selectedChatId)
        .order('created_at', { ascending: true });

      if (error) console.error('Error al cargar los mensajes:', error);
      else setMessages(data || []);
    };

    fetchMessages();

    // Suscribirse a cambios en tiempo real para nuevos mensajes
    const subscription = supabase
      .channel(`public:messages:${selectedChatId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChatId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new;
            setMessages((prev) => [...prev, newMessage]);
            
            // Notificar nuevo mensaje si es del usuario y no es el chat seleccionado actualmente
            if (newMessage.role === 'user' && settings.visualEnabled && selectedChatId !== newMessage.chat_id) {
              notifyNewMessage(
                newMessage.chat_id,
                'Usuario',
                newMessage.text || 'Nuevo mensaje recibido'
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedChatId, settings.visualEnabled, notifyNewMessage]);

  // Actualizar el estado del chat cuando un agente selecciona un chat
  const handleSelectChat = async (chatId: string) => {
    try {
      // Actualizar el estado del chat para indicar que el agente está conectado
      await supabase
        .from('chats')
        .update({ agent_connected: true, agent_name: agentName }) // Actualiza el estado y el nombre del agente
        .eq('id', chatId);

      setSelectedChatId(chatId); // Activar el chat seleccionado
    } catch (error) {
      console.error('Error al conectar el agente:', error);
    }
  };

  // Función para notificar que el agente está escribiendo
  const notifyAgentTyping = (isTypingNow: boolean) => {
    if (!selectedChatId) return;
    
    supabase.channel('typing-indicators').send({
      type: 'broadcast',
      event: 'agent-typing',
      payload: {
        chatId: selectedChatId,
        agentName,
        isTyping: isTypingNow
      }
    });
  };

  // Manejar cambios en el input del agente para mostrar indicador de escribiendo
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setResponse(value);
    
    // Notificar que el agente está escribiendo
    if (value.length > 0 && !isTyping) {
      setIsTyping(true);
      notifyAgentTyping(true);
    }
    
    // Limpiar el timeout anterior
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Establecer un nuevo timeout para ocultar el indicador
    const newTimeout = setTimeout(() => {
      setIsTyping(false);
      notifyAgentTyping(false);
    }, 1000); // 1 segundo después de dejar de escribir
    
    setTypingTimeout(newTimeout);
  };

  // Enviar respuesta del agente
  const handleSendMessage = async () => {
    if (!response.trim() || !selectedChatId) return;

    // Limpiar el indicador de escribiendo antes de enviar
    setIsTyping(false);
    notifyAgentTyping(false);
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Guardar la respuesta del agente en la base de datos
    const { error } = await supabase.from('messages').insert([
      { chat_id: selectedChatId, role: 'agent', text: response },
    ]);

    if (error) console.error('Error al enviar mensaje:', error);
    setResponse('');
  };

  // Cerrar el chat seleccionado
  const handleCloseChat = async () => {
    if (!selectedChatId) return;

    try {
      // Obtener la información del chat para calcular el tiempo de resolución
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select('created_at')
        .eq('id', selectedChatId)
        .single();

      if (chatError) throw chatError;

      const createdAt = new Date(chatData.created_at);
      const closedAt = new Date(); // Hora actual
      const resolutionTime = Math.floor((closedAt.getTime() - createdAt.getTime()) / 1000); // Duración en segundos

      // Actualizar el chat con el estado "resolved", la hora de cierre y el tiempo de resolución
      await supabase
        .from('chats')
        .update({
          status: 'resolved',
          closed_at: closedAt.toISOString(),
          resolution_time: resolutionTime,
        })
        .eq('id', selectedChatId);

      // Limpiar el estado local
      setSelectedChatId(null); // Desactivar el chat seleccionado
      setMessages([]); // Limpiar los mensajes
      setActiveChats((prev) =>
        prev.filter((chat) => chat.id !== selectedChatId) // Eliminar el chat de la lista
      );
    } catch (error) {
      console.error('Error al cerrar el chat:', error);
    }
  };

   // Función para extraer datos del chat
  const extractTicketData = () => {
    // Buscar el último mensaje resumen del bot
    const summaryMessage = [...messages].reverse().find(
      (msg) =>
        msg.role === 'bot' &&
        (msg.text.startsWith('¡Gracias! Aquí está el resumen de tu reporte de FALTANTE:') ||
          msg.text.startsWith('¡Gracias! Aquí está el resumen de tu reporte de SOBRANTE:'))
    );

    if (!summaryMessage) {
      return {
        type: 'Desconocido',
        user: 'Desconocido',
        stockId: 'Desconocido',
        location: 'Desconocido',
        toteNumber: 'N/A',
      };
    }

    let type = 'Desconocido';
    if (summaryMessage.text.includes('FALTANTE')) type = 'FALTANTE';
    if (summaryMessage.text.includes('SOBRANTE')) type = 'SOBRANTE';

    // Extraer los campos usando regex
    let user = 'Desconocido';
    let stockId = 'Desconocido';
    let location = 'Desconocido';
    let toteNumber = 'N/A';

    // FALTANTE: 👤 Usuario: ...\n📍 Ubicación: ...\n🔢 Stock ID: ...\n📦 Tote: ...
    // SOBRANTE: 👤 Usuario: ...\n📦 Tote: ...\n🔢 Stock ID: ...
    if (type === 'FALTANTE') {
      const userMatch = summaryMessage.text.match(/👤 Usuario: (.*)/);
      const locationMatch = summaryMessage.text.match(/📍 Ubicación: (.*)/);
      const stockIdMatch = summaryMessage.text.match(/🔢 Stock ID: (.*)/);
      const toteMatch = summaryMessage.text.match(/📦 Tote: (.*)/);
      if (userMatch) user = userMatch[1].trim();
      if (locationMatch) location = locationMatch[1].trim();
      if (stockIdMatch) stockId = stockIdMatch[1].trim();
      if (toteMatch) toteNumber = toteMatch[1].trim();
    } else if (type === 'SOBRANTE') {
      const userMatch = summaryMessage.text.match(/👤 Usuario: (.*)/);
      const toteMatch = summaryMessage.text.match(/📦 Tote: (.*)/);
      const stockIdMatch = summaryMessage.text.match(/🔢 Stock ID: (.*)/);
      if (userMatch) user = userMatch[1].trim();
      if (toteMatch) toteNumber = toteMatch[1].trim();
      if (stockIdMatch) stockId = stockIdMatch[1].trim();
      location = 'N/A';
    }

    return { type, user, stockId, location, toteNumber };
  };

  // Función para crear un ticket
  const handleCreateTicket = async () => {
    if (!selectedChatId) return;

    try {
      const { type, user, stockId, location, toteNumber } = extractTicketData();

      // Insertar el ticket en la base de datos
      const { error } = await supabase.from('tickets').insert([
        {
          chat_id: selectedChatId,
          type,
          user,
          stock_id: stockId,
          location,
          tote_number: toteNumber,
          created_by: agentName, // Agregar el nombre del agente que crea el ticket
        },
      ]);

      if (error) throw error;

      alert('Ticket creado exitosamente.');
      await handleCloseChat(); // Cerrar el chat automáticamente después de crear el ticket
    } catch (error) {
      console.error('Error al crear el ticket:', error);
      alert('Hubo un error al crear el ticket. Por favor, inténtalo de nuevo.');
    }
  };

  // Descargar la conversación
  const handleDownloadConversation = () => {
    if (!selectedChatId || messages.length === 0) return;

    // Llamar a la función para descargar la conversación
    downloadConversation(messages, selectedChatId);
  };

  // Al deseleccionar un chat o desmontar, marcar el chat como transferido si estaba conectado
  useEffect(() => {
    let prevChatId = selectedChatId;
    return () => {
      if (prevChatId) {
        supabase
          .from('chats')
          .select('status')
          .eq('id', prevChatId)
          .single()
          .then(({ data }) => {
            if (data && data.status === 'active') {
              // Si el chat estaba en 'active', simplemente no hacemos nada especial
              return;
            }
            if (data && data.status === 'transferred') {
              // Si ya está transferido, tampoco hacemos nada
              return;
            }
            if (data && data.status === 'connected') {
              supabase
                .from('chats')
                .update({ status: 'transferred', agent_connected: false, agent_name: null })
                .eq('id', prevChatId);
            }
          });
      }
    };
  }, [selectedChatId]);

  // Limpiar timeout al desmontar componente
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [typingTimeout]);

  if (loading) {
    return <Loading message="Cargando panel de soporte..." />;
  }

  return (
    <div className="agent-dashboard-container">
      <h1 className="text-2xl font-bold mb-4">Panel de Soporte</h1>

      {/* Lista de Chats Activos */}
      <div className="chat-container">
        {/* Recargar chats - botón arriba de los chat-item */}
        <div className="chats-list">
          <div className="chats-list-header">
            <div className="chats-list-title">
              <h2 className="font-semibold">Chats Activos</h2>
              {activeChats.length > 0 && (
                <span className="chats-count-badge">{activeChats.length}</span>
              )}
            </div>
            <div className="header-controls">
              <button
                className="reload-button"
                onClick={fetchActiveChats}
                title="Recargar chats"
              >
                {/* Icono recargar */}
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M4 4v5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2.05 11A8 8 0 1 0 4 4l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              
              {/* Controles de notificaciones */}
              <NotificationSettings compact={true} />
            </div>
          </div>
          <div className="chat-list-container">
            {activeChats.length > 0 ? (
              <ul>
                {activeChats.map((chat) => {
                  // Determinar estado y clase del badge
                  let statusLabel = 'Activo';
                  let statusClass = 'chat-status-badge chat-status-badge--activo';
                  if (chat.status === 'transferred') {
                    statusLabel = 'Transferido';
                    statusClass = 'chat-status-badge chat-status-badge--transferido';
                  } else if (chat.status === 'resolved' || chat.status === 'closed') {
                    statusLabel = 'Cerrado';
                    statusClass = 'chat-status-badge chat-status-badge--cerrado';
                  }
                  return (
                    <li
                      key={chat.id}
                      className={`chat-item${selectedChatId === chat.id ? ' chat-item-selected' : ''}`}
                      onClick={() => handleSelectChat(chat.id)}
                    >
                      <div className="chat-item-content">
                        <span className="chat-item-title" style={{
                          color: selectedChatId === chat.id ? '#2563eb' : '#263159'
                        }}>
                          Chat ID: {chat.id}
                        </span>
                        <div className="chat-item-badges">
                          <span className="chat-time-badge">
                            {/* Icono de tiempo */}
                            <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
                              <circle cx="10" cy="10" r="8" stroke="#2563eb" strokeWidth="2" fill="none"/>
                              <path d="M10 6V10L13 12" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            {calculateElapsedTime(chat.created_at)}
                          </span>
                          <span className={statusClass}>
                            {/* Icono de estado (opcional, por ejemplo un círculo) */}
                            <svg width="10" height="10" viewBox="0 0 10 10" style={{marginRight: 5}}>
                              <circle cx="5" cy="5" r="4" fill={
                                chat.status === 'transferred' ? '#b48a00' :
                                (chat.status === 'resolved' || chat.status === 'closed') ? '#888' : '#2563eb'
                              } />
                            </svg>
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="no-chats-empty-state">
                <div className="no-chats-icon">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                    <path d="M17 9V7C17 4.24 14.76 2 12 2S7 4.24 7 7V9C5.9 9 5 9.9 5 11V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V11C19 9.9 18.1 9 17 9ZM12 17.5C11.17 17.5 10.5 16.83 10.5 16S11.17 14.5 12 14.5S13.5 15.17 13.5 16S12.83 17.5 12 17.5ZM15.1 9H8.9V7C8.9 5.29 10.29 3.9 12 3.9S15.1 5.29 15.1 7V9Z" fill="#cbd5e1"/>
                  </svg>
                </div>
                <h3 className="no-chats-title">No hay chats activos</h3>
                <p className="no-chats-description">
                  Los nuevos chats aparecerán aquí automáticamente cuando los usuarios inicien conversaciones.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Seleccionado */}
        <div className="chat-display">
          {!selectedChatId ? (
            <div className="chat-empty-state">
              <div className="chat-empty-content">
                <div className="chat-empty-icon">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3C7.03 3 3 6.582 3 11C3.002 12.73 3.473 14.42 4.358 15.883L3 20L7.117 18.642C8.58 19.527 10.27 19.998 12 20C16.97 20 21 16.418 21 12C21 6.582 16.97 3 12 3Z" stroke="#cbd5e1" strokeWidth="1.5" fill="none"/>
                    <circle cx="8" cy="12" r="1" fill="#cbd5e1"/>
                    <circle cx="12" cy="12" r="1" fill="#cbd5e1"/>
                    <circle cx="16" cy="12" r="1" fill="#cbd5e1"/>
                  </svg>
                </div>
                <h2 className="chat-empty-title">Selecciona un chat para comenzar</h2>
                <p className="chat-empty-description">
                  Elige un chat de la lista de la izquierda para ver la conversación y poder responder a los usuarios.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Botones de acción arriba del Chat ID */}
              <div className="chat-action-buttons">
                <button
                  onClick={handleCloseChat}
                  className="chat-action-button close-button"
                >
                  {/* Icono cerrar */}
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{marginRight: 4}}>
                    <path d="M6 6L14 14M6 14L14 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Cerrar Chat
                </button>
                <button
                  onClick={handleDownloadConversation}
                  className="chat-action-button download-button"
                >
                  {/* Icono descargar */}
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{marginRight: 4}}>
                    <path d="M10 3V15M10 15L5 10M10 15L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="3" y="17" width="14" height="2" rx="1" fill="currentColor"/>
                  </svg>
                  Descargar Conversación
                </button>
                <button
                  onClick={handleCreateTicket}
                  className="chat-action-button ticket-button"
                >
                  {/* Icono ticket */}
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{marginRight: 4}}>
                    <rect x="4" y="4" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M7 8H13M7 12H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Crear Ticket
                </button>
              </div>
              {/* Línea divisora */}
              <div className="chat-action-divider"></div>
              <h2 className="font-semibold mb-2">Chat ID: {selectedChatId}</h2>
              <div className="messages-container">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`message-bubble ${
                      msg.role === 'user'
                        ? 'user-message'
                        : msg.role === 'agent'
                        ? 'agent-message'
                        : 'bot-message'
                    }`}
                  >
                    <strong>{msg.role}:</strong> {msg.text}
                  </div>
                ))}
                
                {/* Indicador de que el usuario está escribiendo */}
                {selectedChatId && userTyping[selectedChatId] && (
                  <div className="typing-indicator user-typing">
                    <div className="typing-bubble">
                      <strong>usuario:</strong> está escribiendo
                      <div className="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {/* Indicador de que el agente está escribiendo */}
                {isTyping && (
                  <div className="agent-typing-indicator">
                    <span>Escribiendo...</span>
                  </div>
                )}
                
                <div className="message-input-container">
                  <textarea
                    value={response}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="message-input"
                    placeholder="Escribe tu respuesta..."
                  />
                  <button
                    onClick={handleSendMessage}
                    className="send-button"
                  >
                    {/* Icono enviar */}
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M3 17L17 10L3 3V8L13 10L3 12V17Z" fill="currentColor"/>
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentDashboard;