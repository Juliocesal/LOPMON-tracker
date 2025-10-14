// src/pages/ChatPage.tsx
import { useCallback, useEffect, useState, useRef } from 'react';
import ChatWindow from '../components/ChatWindow';
import useChat from '../hooks/useChat';
import { supabase } from '../utils/supabaseClient';
import { useNotifications } from '../contexts/NotificationContext';
import toast, { Toaster } from 'react-hot-toast';
import Loading from '../components/Loading';
import '../styles/chatWindow.css';



const ChatPage = () => {
  const { messages, sendMessage, chatId, resetChatState } = useChat();
  const { notifySuccess } = useNotifications(); // Remove notifyInfo since it's not used
  const [isChatClosed, setIsChatClosed] = useState(false);
  const [toastShown, setToastShown] = useState(false); // Estado para evitar duplicación de notificaciones
  const [agentConnected, setAgentConnected] = useState(false); // Estado para verificar si un agente está conectado
  const [agentDisconnected, setAgentDisconnected] = useState(false);
  const [agentName, setAgentName] = useState<string>(''); // Nombre del agente
  const [loading, setLoading] = useState(true); // Loading state
  const [showChat, setShowChat] = useState(true);
  const toastIdRef = useRef<string | null>(null);

  // Función para limpiar notificaciones existentes
  const clearExistingToasts = useCallback(() => {
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
  }, []);

  // Función para mostrar notificación del agente
  const showAgentNotification = useCallback((type: 'connect' | 'disconnect', agentName: string) => {
    clearExistingToasts();
    
    if (type === 'connect') {
      toastIdRef.current = toast(
        `El agente ${agentName || 'Desconocido'} se ha conectado al chat`, 
        { 
          duration: 4000,
          icon: '✅'
        }
      );
    } else {
      toastIdRef.current = toast(
        `El agente ${agentName || 'Desconocido'} se ha desconectado del chat`,
        { 
          duration: 4000,
          icon: 'ℹ️'
        }
      );
    }
  }, [clearExistingToasts]);

  // Verificar el estado inicial del chat al cargar
  useEffect(() => {
    if (!chatId) return;
    let mounted = true;

    const checkInitialStatus = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('chats')
          .select('status, agent_connected, agent_name')
          .eq('id', chatId)
          .single();

        if (mounted && !error) {
          if (data?.status === 'resolved' || data?.status === 'closed') {
            setIsChatClosed(true);
            setToastShown(true);
            setAgentConnected(false);
          } else if (data?.agent_connected) {
            setAgentConnected(true);
            setAgentName(data.agent_name || 'Agente Desconocido');
            if (!toastShown) {
              showAgentNotification('connect', data.agent_name);
              setToastShown(true);
            }
          }
        }
      } catch (error) {
        console.error('Error loading chat status:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkInitialStatus();
    return () => { mounted = false; };
  }, [chatId, showAgentNotification, toastShown]);

  // Suscribirse a cambios en tiempo real para el estado del chat
  useEffect(() => {
    if (!chatId) return;

    const subscription = supabase // Remove isSubscribed since it's not used
      .channel(`public:chats:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chats',
          filter: `id=eq.${chatId}`,
        },
        (payload) => {
          const updatedChat = payload.new;
          const previousChat = payload.old;

          // Manejar cierre del chat
          if (updatedChat.status === 'resolved' || updatedChat.status === 'closed') {
            setIsChatClosed(true);
            setAgentConnected(false);
            if (!toastShown) {
              clearExistingToasts();
              toastIdRef.current = toast('🔒 El chat ha sido cerrado.', {
                duration: 4000,
              });
              setToastShown(true);
            }
            return;
          }

          // Manejar conexión/desconexión del agente
          if (previousChat.agent_connected !== updatedChat.agent_connected) {
            setAgentConnected(updatedChat.agent_connected);
            if (updatedChat.agent_connected) {
              setAgentName(updatedChat.agent_name || 'Agente Desconocido');
              showAgentNotification('connect', updatedChat.agent_name);
              setAgentDisconnected(false);
            } else {
              showAgentNotification('disconnect', agentName);
              setAgentDisconnected(true);
            }
          }
        }
      )
      .subscribe();

    return () => {
      clearExistingToasts();
      if (subscription) subscription.unsubscribe();
    };
  }, [chatId, agentName, showAgentNotification, clearExistingToasts, toastShown]);

  const handleNewChat = useCallback(() => {
    setShowChat(false);
    clearExistingToasts();
    setTimeout(() => {
      setIsChatClosed(false);
      setToastShown(false);
      setAgentConnected(false);
      setAgentDisconnected(false);
      setAgentName('');
      resetChatState();
      setShowChat(true);
    }, 100);
  }, [resetChatState, clearExistingToasts]);

  if (loading) {
    return <Loading message="Cargando chat..." />;
  }

  if (!chatId) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div>
          <ChatWindow
            messages={[]} // Sin mensajes aún
            onSendMessage={() => {}}
            chatId={''}
            isChatClosed={false}
            agentConnected={false}
            agentName=""
            loading={true}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div>
          {showChat && (
            <ChatWindow
              messages={messages}
              onSendMessage={sendMessage}
              chatId={chatId}
              isChatClosed={isChatClosed}
              agentConnected={agentConnected}
              agentName={agentName}
              loading={loading}
              onNewChat={handleNewChat}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default ChatPage;