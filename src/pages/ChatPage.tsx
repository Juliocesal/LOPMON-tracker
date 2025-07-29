// src/pages/ChatPage.tsx
import { useEffect, useState } from 'react';
import ChatWindow from '../components/ChatWindow';
import useChat from '../hooks/useChat';
import { supabase } from '../utils/supabaseClient';
import { useNotifications } from '../contexts/NotificationContext';
import toast, { Toaster } from 'react-hot-toast';
import Loading from '../components/Loading';
import '../styles/chatWindow.css';
import '../styles/OpenPos.css'; // Importa el CSS específico para esta página


const ChatPage = () => {
  const { messages, sendMessage, chatId } = useChat();
  const { notifySuccess, notifyInfo } = useNotifications();
  const [isChatClosed, setIsChatClosed] = useState(false);
  const [toastShown, setToastShown] = useState(false); // Estado para evitar duplicación de notificaciones
  const [agentConnected, setAgentConnected] = useState(false); // Estado para verificar si un agente está conectado
  const [agentName, setAgentName] = useState<string>(''); // Nombre del agente
  const [loading, setLoading] = useState(true); // Loading state

  // Verificar el estado inicial del chat al cargar
  useEffect(() => {
    if (!chatId) return;
    let mounted = true;

    console.log('[ChatPage] useEffect inicial, chatId:', chatId); // LOG para identificar ID recibido

    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('chats')
          .select('status, agent_connected, agent_name')
          .eq('id', chatId)
          .single();

        if (mounted && !error) {
          if (data?.status === 'resolved') {
            setIsChatClosed(true);
            setToastShown(true); // Ya estaba cerrado al cargar
          }
          if (data?.agent_connected) {
            setAgentConnected(true); // El agente ya estaba conectado al cargar
            setAgentName(data.agent_name || 'Agente Desconocido'); // Guardar el nombre del agente
            // Notificar que un agente ya estaba conectado
            notifyInfo(`Agente ${data.agent_name || 'Desconocido'} está atendiendo tu chat`);
          }
        }
      } catch (error) {
        console.error('Error loading chat status:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [chatId]);

  // Suscribirse a cambios en tiempo real para el estado del chat
  useEffect(() => {
    if (!chatId) return;

    console.log('[ChatPage] Suscribiéndose a cambios en tiempo real para chatId:', chatId); // LOG para identificar ID usado en la subscripción

    const subscription = supabase
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

          // Verificar si el chat ha sido cerrado
          if (updatedChat.status === 'resolved') {
            setIsChatClosed(true);
            if (!toastShown) {
              toast('🔒 El agente ha cerrado el chat.', {
                icon: '🔕',
                duration: 4000,
                style: {
                  background: '#fff',
                  color: '#333',
                  border: '1px solid #ccc',
                },
              });
              setToastShown(true); // Evitar duplicación
            }
          }

          // Notificar cuando el agente se conecta
          if (updatedChat.agent_connected) {
            setAgentConnected(true);
            setAgentName(updatedChat.agent_name || 'Agente Desconocido'); // Guardar el nombre del agente
            // Notificación global
            notifySuccess(`El agente ${updatedChat.agent_name || 'Desconocido'} se ha conectado al chat`);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [chatId, toastShown]);

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
          {/* Siempre mostrar ChatWindow */}
          <ChatWindow
            messages={messages}
            onSendMessage={sendMessage}
            chatId={chatId}
            isChatClosed={isChatClosed}
            agentConnected={agentConnected}
            agentName={agentName}
            loading={false}
          />
        </div>
      </div>
    </>
  );
};

export default ChatPage;