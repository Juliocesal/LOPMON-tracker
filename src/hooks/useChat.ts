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
        // Marcar como inicializado antes de crear la sesión
        initialized.current = true;
        
        // Limpiar estado anterior al iniciar nuevo chat
        resetChatState();
        
        // Crear una nueva sesión de chat
        const session = await createChatSession();
        console.log('[useChat] Chat session created:', session); // LOG para identificar ID creado
        setChatId(session.id);

        // Verificar si ya existen mensajes para este chat
        // Suponiendo que existe una función getMessages(chatId) en ChatApi
        let existingMessages: Message[] = [];
        if (typeof session.id === 'string' && session.id.length > 0) {
          if (typeof (window as any).getMessages === 'function') {
            existingMessages = await (window as any).getMessages(session.id);
            console.log('[useChat] Mensajes existentes para chatId', session.id, existingMessages);
          }
        }

        if (!existingMessages || existingMessages.length === 0) {
  const initialMessage: Message = {
    role: 'bot',
    text: "¡Hola! Soy tu asistente virtual de ESSILOR LUXOTTICA. ¿Cuál es tu Usuario de SAP?",
  };
  await saveMessage(session.id, 'bot', initialMessage.text);
  setMessages([initialMessage]);
} else {
  // Evitar duplicar el mensaje inicial
  const hasInitialBotMessage = existingMessages.some(
    (msg) => msg.role === 'bot' && msg.text.includes('¡Hola! Soy tu asistente virtual')
  );

  if (!hasInitialBotMessage) {
    const initialMessage: Message = {
      role: 'bot',
      text: "¡Hola! Soy tu asistente virtual de ESSILOR LUXOTTICA. ¿Cuál es tu Usuario de SAP?",
    };
    await saveMessage(session.id, 'bot', initialMessage.text);
    setMessages([...existingMessages, initialMessage]);
  } else {
    setMessages(existingMessages);
  }
}

      } catch (error) {
        console.error("Error al inicializar el chat:", error);
        // Reset en caso de error
        initialized.current = false;
      }
    };
    initChat();
  }, []); // CAMBIADO: Remover chatId de las dependencias

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