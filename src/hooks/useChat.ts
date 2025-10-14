// src/hooks/useChat.ts
import { useState, useEffect, useRef } from 'react';
import { createChatSession, saveMessage, transferChatToAgent } from '../api/ChatApi'; // Importamos las funciones de la API
import { Message } from '../hooks/types'; // Importamos la interfaz
import { supabase } from '../utils/supabaseClient';

const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatId, setChatId] = useState<string>('');
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    user: '',
  });
  const [isTransferred, setIsTransferred] = useState(false);
  const initialized = useRef(false);

  // Modificar el useEffect de inicialización
  useEffect(() => {
    if (initialized.current) {
      console.log('[useChat] Ya inicializado, evitando duplicación');
      return;
    }

    const initChat = async () => {
      try {
        const savedChatId = localStorage.getItem('activeChatId');
        const chatClosed = localStorage.getItem(`chat_closed_${savedChatId}`);
        const currentStep = localStorage.getItem('chatCurrentStep');
        
        if (savedChatId && !chatClosed) {
          console.log('[useChat] Restaurando chat existente:', savedChatId);
          initialized.current = true;
          setChatId(savedChatId);
          
          // Cargar mensajes existentes
          const { data: existingMessages } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', savedChatId)
            .order('created_at', { ascending: true });
          
          if (existingMessages && existingMessages.length > 0) {
            const formattedMessages = existingMessages.map(msg => ({
              role: msg.role,
              text: msg.text,
              id: msg.id
            }));
            setMessages(formattedMessages);
            // Establecer el currentStep basado en el último mensaje
            if (currentStep) {
              setCurrentStep(Number(currentStep));
            } else {
              // Determinar el paso actual basado en los mensajes existentes
              const lastBotMessage = formattedMessages
                .filter(msg => msg.role === 'bot')
                .pop();
              if (lastBotMessage?.text.includes('se conectará en breve')) {
                setCurrentStep(2);
              } else if (lastBotMessage?.text.includes('es correcto?')) {
                setCurrentStep(1);
              }
            }
            return;
          }
        }

        // Si no hay chat activo o está cerrado, crear uno nuevo
        await createNewChat();

      } catch (error) {
        console.error("Error al inicializar el chat:", error);
        initialized.current = false;
      }
    };

    initChat();
  }, []); // CAMBIADO: Remover chatId de las dependencias

  // Nueva función auxiliar para crear un nuevo chat
  const createNewChat = async () => {
    try {
      initialized.current = true;
      const session = await createChatSession();
      console.log('[useChat] Chat session created:', session);
      setChatId(session.id);
      localStorage.setItem('activeChatId', session.id);
      setCurrentStep(0);

      // Agregar flag para controlar la inicialización del mensaje
      const initialMessageKey = `initial_message_sent_${session.id}`;
      
      if (!localStorage.getItem(initialMessageKey)) {
        const initialMessage: Message = {
          role: 'bot',
          text: "¡Hola! Soy tu asistente virtual de ESSILOR LUXOTTICA. ¿Cuál es tu Usuario de SAP?",
        };
        
        // Guardar el mensaje en la base de datos
        const savedMessage = await saveMessage(session.id, 'bot', initialMessage.text);
        
        // Actualizar el mensaje local con el ID recibido
        if (savedMessage?.id) {
          initialMessage.id = savedMessage.id;
        }
        
        // Establecer el mensaje en el estado local
        setMessages([initialMessage]);
        
        // Marcar que el mensaje inicial ya fue enviado
        localStorage.setItem(initialMessageKey, 'true');
      }
      
      return session;
    } catch (error) {
      console.error("Error al crear nuevo chat:", error);
      throw error;
    }
  };

  // Función para reiniciar el estado del chat
  const resetChatState = async () => {
    setMessages([]);
    setCurrentStep(0);
    setFormData({ user: '' });
    setIsTransferred(false);
    setChatId('');
    initialized.current = false;

    // Limpiar localStorage
    localStorage.removeItem('chatCurrentStep');
    localStorage.removeItem('chatFormData');
    localStorage.removeItem('activeChatId');
    
    // Limpiar estados relacionados con el chat cerrado
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('chat_closed_') || key.startsWith('chat_status_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Crear nuevo chat usando la función auxiliar
    try {
      await createNewChat();
    } catch (error) {
      console.error("Error al resetear el chat:", error);
    }
  };

  // Restaurar currentStep y formData desde localStorage si existen (solo para chats existentes)
  useEffect(() => {
    // Solo restaurar si hay un chatId válido y no es una nueva sesión
    if (chatId && !initialized.current) {
      const savedStep = localStorage.getItem('chatCurrentStep');
      const savedFormData = localStorage.getItem('chatFormData');
      if (savedStep) setCurrentStep(Number(savedStep));
      if (savedFormData) setFormData(JSON.parse(savedFormData));
    }
  }, [chatId]);

  // Guardar currentStep y formData en localStorage cada vez que cambian
  useEffect(() => {
    localStorage.setItem('chatCurrentStep', String(currentStep));
    localStorage.setItem('chatFormData', JSON.stringify(formData));
  }, [currentStep, formData]);

  // Función para normalizar respuestas de usuario
  const normalizeUserInput = (message: string): string => {
    const normalized = message.toLowerCase().trim();
    // Normalizar variaciones de "sí"
    if (normalized === 'si' || normalized === 'sí' || normalized === 'yes' || normalized === 'y') {
      return 'sí';
    }
    // Normalizar variaciones de "no"
    if (normalized === 'no' || normalized === 'n') {
      return 'no';
    }
    return message.trim();
  };

  // Enviar un mensaje (usuario o chatbot)
  const sendMessage = async (message: string) => {
    if (!chatId) return;

    try {
      const normalizedMessage = normalizeUserInput(message);
      const userMessage: Message = { 
        role: 'user', 
        text: message 
      };
      const savedMessage = await saveMessage(chatId, 'user', message);
      if (savedMessage?.id) {
        userMessage.id = savedMessage.id;
      }
      setMessages((prev) => [...prev, userMessage]);

      if (isTransferred) return;

      let nextStep = currentStep;
      let nextFormData = { ...formData };
      let botResponseText = '';

      // Verificar si el chat ya está en estado de espera de agente
      const isWaitingForAgent = messages.some(
        msg => msg.role === 'bot' && 
        msg.text.includes('Un Exception se conectará')
      );

      if (isWaitingForAgent) {
        return; // No enviar más mensajes del bot si ya estamos esperando un agente
      }

      if (currentStep === 0) {
        nextFormData.user = message;
        nextStep = 1;
        botResponseText = `El nombre "${message}" es correcto?`;
      } else if (currentStep === 1) {
        if (normalizedMessage === 'sí' || normalizedMessage === 'si') {
          nextStep = 2;
          botResponseText = 'Perfecto. Un Exception se conectará en breve para ayudarte.';
          
          setTimeout(async () => {
            await transferChatToAgent(chatId);
            setIsTransferred(true);
          }, 500);
        } else if (normalizedMessage === 'no') {
          nextStep = 0;
          botResponseText = 'Por favor, ingresa tu nombre nuevamente:';
        } else {
          botResponseText = 'Por favor responde "Sí" o "No". ¿El nombre es correcto?';
        }
      }

      if (botResponseText) {
        const botMessage: Message = { 
          role: 'bot', 
          text: botResponseText 
        };
        const savedBotMessage = await saveMessage(chatId, 'bot', botMessage.text);
        if (savedBotMessage?.id) {
          botMessage.id = savedBotMessage.id;
        }
        setMessages((prev) => [...prev, botMessage]);
      }

      setCurrentStep(nextStep);
      setFormData(nextFormData);

    } catch (error) {
      console.error("Error al enviar mensaje:", error);
    }
  };

  useEffect(() => {
    console.log('[useChat] chatId actualizado:', chatId);
  }, [chatId]);

  return { messages, sendMessage, chatId, resetChatState };
};

export default useChat;