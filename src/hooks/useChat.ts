// src/hooks/useChat.ts
import { useState, useEffect, useRef } from 'react';
import { createChatSession, saveMessage, transferChatToAgent } from '../api/ChatApi'; // Importamos las funciones de la API
import { Message } from '../hooks/types'; // Importamos la interfaz

const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatId, setChatId] = useState<string>('');
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    user: '',
  });
  const [isTransferred, setIsTransferred] = useState(false);
  const initialized = useRef(false);

  // Función para reiniciar el estado del chat
  const resetChatState = () => {
    setCurrentStep(0);
    setFormData({
      user: '',
    });
    setIsTransferred(false);
    localStorage.removeItem('chatCurrentStep');
    localStorage.removeItem('chatFormData');
  };

  // Crear una nueva sesión de chat al cargar el componente
  useEffect(() => {
  // Evitar doble inicialización con useRef
  if (initialized.current) {
    console.log('[useChat] Ya inicializado, evitando duplicación');
    return;
  }

  const initChat = async () => {
    try {
      // Revisar si ya existe un chat activo
      const existingChatId = localStorage.getItem('activeChatId');
      let chatSessionId = '';

      if (existingChatId) {
        chatSessionId = existingChatId;
        setChatId(chatSessionId);

        // Traer mensajes existentes
        if (typeof (window as any).getMessages === 'function') {
          const existingMessages = await (window as any).getMessages(chatSessionId);
          if (existingMessages?.length > 0) {
            setMessages(existingMessages);
            console.log('[useChat] Mensajes cargados del chat existente:', chatSessionId, existingMessages);
          }
        }

        initialized.current = true; // Marcar como inicializado
        return; // No crear chat nuevo
      }

      // Si no hay chat existente, crear uno nuevo
      const session = await createChatSession();
      chatSessionId = session.id;
      setChatId(chatSessionId);
      localStorage.setItem('activeChatId', chatSessionId);

      // Mensaje inicial
      const initialMessage: Message = {
        role: 'bot',
        text: "¡Hola! Soy tu asistente virtual de ESSILOR LUXOTTICA. ¿Cuál es tu Usuario de SAP?",
      };

      await saveMessage(chatSessionId, 'bot', initialMessage.text);
      setMessages([initialMessage]);

      initialized.current = true; // Marcar como inicializado
    } catch (error) {
      console.error('[useChat] Error inicializando chat:', error);
      initialized.current = false; // Reset en caso de error
    }
  };

  initChat();
}, []); // Dependencias vacías para que solo corra al montar


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
      const userMessage: Message = { role: 'user', text: message };
      await saveMessage(chatId, 'user', message);
      setMessages((prev) => [...prev, userMessage]);
      console.log('[useChat] Mensaje de usuario enviado:', message);

      if (isTransferred) return;

      let nextStep = currentStep;
      let nextFormData = { ...formData };
      let botResponseText = '';

      if (currentStep === 0) {
        nextFormData.user = message;
        nextStep = 1;
        botResponseText = `El nombre "${message}" es correcto?`;
      } else if (currentStep === 1) {
        if (normalizedMessage === 'sí' || normalizedMessage === 'si') {
          nextStep = 2;
          botResponseText = 'Perfecto. Un Exception se conectará en breve para ayudarte.';
          
          // Transferir el chat inmediatamente después de confirmar el nombre
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
      } else if (currentStep === 2) {
        botResponseText = 'Un Exception se conectará contigo en breve.';
      }

      setCurrentStep(nextStep);
      setFormData(nextFormData);

      const botMessage: Message = { role: 'bot', text: botResponseText };
      await saveMessage(chatId, 'bot', botMessage.text);
      setMessages((prev) => [...prev, botMessage]);
      console.log('[useChat] Mensaje del bot enviado:', botMessage.text);

      // Transferir el chat al soporte humano si es necesario
      if (nextStep === 2) {
        await transferChatToAgent(chatId);
        setIsTransferred(true);
        console.log('[useChat] Chat transferido a agente para chatId:', chatId);
      }
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