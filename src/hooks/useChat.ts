// src/hooks/useChat.ts
import { useState, useEffect, useRef } from 'react';
import { createChatSession, saveMessage, transferChatToAgent } from '../api/ChatApi'; // Importamos las funciones de la API
import { Message } from '../hooks/types'; // Importamos la interfaz

const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]); // Estado de los mensajes
  const [chatId, setChatId] = useState<string>(''); // ID del chat (inicializado como string vacío)
  const [currentStep, setCurrentStep] = useState(0); // Paso actual del chatbot
  const [formData, setFormData] = useState({
    user: '', // Nuevo campo para el usuario
    problemType: '', // Me falta material / Me sobra material
    location: '', // Ubicación del tote
    toteNo: '', // Número de tote
    stockID: '', // Número de stock ID
    correctionField: '', // Campo que se está corrigiendo
  });
  const [isTransferred, setIsTransferred] = useState(false); // NUEVO: bandera de transferencia
  const initialized = useRef(false); // NUEVO: Ref para prevenir doble inicialización

  // Función para reiniciar el estado del chat
  const resetChatState = () => {
    setCurrentStep(0);
    setFormData({
      user: '',
      problemType: '',
      location: '',
      toteNo: '',
      stockID: '',
      correctionField: '',
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
          // Primer mensaje del chatbot solo si no hay mensajes previos
          const initialMessage: Message = {
            role: 'bot',
            text: "¡Hola! Soy tu asistente virtual de ESSILOR LUXOTTICA. ¿Qué problema tienes con el tote?",
          };
          await saveMessage(session.id, 'bot', initialMessage.text); // Guardar el mensaje en la tabla `messages`
          setMessages([initialMessage]);
          console.log('[useChat] Mensaje inicial del bot enviado:', initialMessage.text);
        } else {
          setMessages(existingMessages);
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
      const userMessage: Message = { role: 'user', text: message }; // Mostrar el mensaje original
      await saveMessage(chatId, 'user', message);
      setMessages((prev) => [...prev, userMessage]);
      console.log('[useChat] Mensaje de usuario enviado:', message);

      if (isTransferred) return;

      let nextStep = currentStep;
      let nextFormData = { ...formData };
      let botResponseText = '';

      // FALTANTE (Me falta material)
      if (formData.problemType === 'Me falta material' || (currentStep === 0 && (normalizedMessage === 'Me falta material'))) {
        if (currentStep === 0) {
          nextFormData.problemType = 'Me falta material';
          nextStep = 1;
          botResponseText = 'Vamos a registrar un FALTANTE. Por favor, responde con la siguiente información. ✅\n\nPrimero, ¿cuál es tu Usuario?';
        } else if (currentStep === 1) {
          nextFormData.user = message;
          nextStep = 2;
          botResponseText = `Gracias, ${message}. Ahora dime, ¿cuál es la ubicación (locación) donde notaste el faltante?`;
        } else if (currentStep === 2) {
          nextFormData.location = message;
          nextStep = 3;
          botResponseText = `La ubicación (${message}) está correctamente escrita?`;
        } else if (currentStep === 3) {
          if (normalizedMessage === 'no') {
            nextStep = 2;
            botResponseText = 'Por favor, indícame de nuevo la ubicación.';
          } else if (normalizedMessage === 'sí') {
            nextStep = 4;
            botResponseText = 'Perfecto. Ahora dime, ¿cuál es el Stock ID del material que hace falta?';
          } else {
            nextStep = 3;
            botResponseText = `La ubicación (${nextFormData.location}) está correctamente escrita?`;
          }
        } else if (currentStep === 4) {
          nextFormData.stockID = message;
          nextStep = 5;
          botResponseText = `El Stock ID (${message}) es correcto?`;
        } else if (currentStep === 5) {
          if (normalizedMessage === 'no') {
            nextStep = 4;
            botResponseText = 'Por favor, indícame de nuevo el Stock ID del faltante.';
          } else if (normalizedMessage === 'sí') {
            nextStep = 6;
            botResponseText = 'Finalmente, ¿cuál es el número de TOTE relacionado con este faltante?';
          } else {
            nextStep = 5;
            botResponseText = `El Stock ID (${nextFormData.stockID}) es correcto?`;
          }
        } else if (currentStep === 6) {
          nextFormData.toteNo = message;
          nextStep = 7;
          botResponseText = `El tote (${message}) es correcto?`;
        } else if (currentStep === 7) {
          if (normalizedMessage === 'no') {
            nextStep = 6;
            botResponseText = 'Por favor, indícame de nuevo el número de TOTE.';
          } else if (normalizedMessage === 'sí') {
            nextStep = 9; // Pasar directamente al step de confirmación
            botResponseText = `¡Gracias! Aquí está el resumen de tu reporte de FALTANTE:\n\n👤 Usuario: ${nextFormData.user}\n📍 Ubicación: ${nextFormData.location}\n🔢 Stock ID: ${nextFormData.stockID}\n📦 Tote: ${nextFormData.toteNo}`;
            
            // Enviar automáticamente la pregunta de confirmación después del resumen
            setTimeout(async () => {
              const confirmationMessage: Message = {
                role: 'bot',
                text: '¿Los datos del reporte están correctos?',
              };
              await saveMessage(chatId, 'bot', confirmationMessage.text);
              setMessages((prev) => [...prev, confirmationMessage]);
            }, 500); // Reducido a 500ms para que aparezca más rápido
          } else {
            nextStep = 7;
            botResponseText = `El tote (${nextFormData.toteNo}) es correcto?`;
          }
        } else if (currentStep === 9) {
          if (normalizedMessage === 'sí') {
            nextStep = 12;
            botResponseText = 'Perfecto. Tu reporte ha sido registrado y transferido a un agente. Por favor, espera mientras se conecta un agente para ayudarte.';
          } else if (normalizedMessage === 'no') {
            nextStep = 10;
            botResponseText = '¿Qué campo necesitas corregir?';
          } else {
            nextStep = 9;
            botResponseText = '¿Los datos del reporte están correctos?';
          }
        } else if (currentStep === 10) {
          // Usuario selecciona qué campo corregir
          nextFormData.correctionField = message;
          nextStep = 11;
          if (message === 'Usuario') {
            botResponseText = 'Por favor, ingresa el usuario correcto:';
          } else if (message === 'Ubicación') {
            botResponseText = 'Por favor, ingresa la ubicación correcta:';
          } else if (message === 'Stock ID') {
            botResponseText = 'Por favor, ingresa el Stock ID correcto:';
          } else if (message === 'Tote') {
            botResponseText = 'Por favor, ingresa el número de tote correcto:';
          } else {
            nextStep = 10;
            botResponseText = '¿Qué campo necesitas corregir?';
          }
        } else if (currentStep === 11) {
          // Usuario corrige el campo seleccionado
          if (nextFormData.correctionField === 'Usuario') {
            nextFormData.user = message;
          } else if (nextFormData.correctionField === 'Ubicación') {
            nextFormData.location = message;
          } else if (nextFormData.correctionField === 'Stock ID') {
            nextFormData.stockID = message;
          } else if (nextFormData.correctionField === 'Tote') {
            nextFormData.toteNo = message;
          }
          nextStep = 9; // Pasar directamente al step de confirmación
          botResponseText = `¡Gracias! Aquí está el resumen actualizado de tu reporte de FALTANTE:\n\n👤 Usuario: ${nextFormData.user}\n📍 Ubicación: ${nextFormData.location}\n🔢 Stock ID: ${nextFormData.stockID}\n📦 Tote: ${nextFormData.toteNo}`;
          
          // Enviar automáticamente la pregunta de confirmación después del resumen actualizado
          setTimeout(async () => {
            const confirmationMessage: Message = {
              role: 'bot',
              text: '¿Los datos del reporte están correctos?',
            };
            await saveMessage(chatId, 'bot', confirmationMessage.text);
            setMessages((prev) => [...prev, confirmationMessage]);
          }, 500);
        } else if (currentStep === 12) {
          nextStep = 12;
          botResponseText = 'Tu reporte está siendo procesado. Un agente se conectará pronto.';
        }
      }
      // SOBRANTE (Me sobra material)
      else if (formData.problemType === 'Me sobro material' || (currentStep === 0 && (normalizedMessage === 'Me sobro material'))) {
        if (currentStep === 0) {
          nextFormData.problemType = 'Me sobro material';
          nextStep = 20;
          botResponseText = 'Veo que quieres reportar un SOBRANTE. Vamos a registrar la información necesaria. ✅\n\nPrimero, ¿puedes darme tu usuario?';
        } else if (currentStep === 20) {
          nextFormData.user = message;
          nextStep = 21;
          botResponseText = `Gracias, ${message}. Ahora dime, ¿cuál es el número de TOTE donde encontraste el sobrante?`;
        } else if (currentStep === 21) {
          nextFormData.toteNo = message;
          nextStep = 22;
          botResponseText = `El número de tote (${message}) es correcto?`;
        } else if (currentStep === 22) {
          if (normalizedMessage === 'no') {
            nextStep = 21;
            botResponseText = 'Por favor, indícame de nuevo el número de tote.';
          } else if (normalizedMessage === 'sí') {
            nextStep = 23;
            botResponseText = 'Perfecto. Ahora, por favor dime el Stock ID del material que está sobrando.';
          } else {
            nextStep = 22;
            botResponseText = `El número de tote (${nextFormData.toteNo}) es correcto?`;
          }
        } else if (currentStep === 23) {
          nextFormData.stockID = message;
          nextStep = 24;
          botResponseText = `El Stock ID (${message}) es correcto?`;
        } else if (currentStep === 24) {
          if (normalizedMessage === 'no') {
            nextStep = 23;
            botResponseText = 'Por favor, indícame de nuevo el Stock ID del sobrante.';
          } else if (normalizedMessage === 'sí') {
            nextStep = 26; // Pasar directamente al step de confirmación
            botResponseText = `¡Gracias! Aquí está el resumen de tu reporte de SOBRANTE:\n\n👤 Usuario: ${nextFormData.user}\n📦 Tote: ${nextFormData.toteNo}\n🔢 Stock ID: ${nextFormData.stockID}`;
            
            // Enviar automáticamente la pregunta de confirmación después del resumen
            setTimeout(async () => {
              const confirmationMessage: Message = {
                role: 'bot',
                text: '¿Los datos del reporte están correctos?',
              };
              await saveMessage(chatId, 'bot', confirmationMessage.text);
              setMessages((prev) => [...prev, confirmationMessage]);
            }, 500);
          } else {
            nextStep = 24;
            botResponseText = `El Stock ID (${nextFormData.stockID}) es correcto?`;
          }
        } else if (currentStep === 26) {
          if (normalizedMessage === 'sí') {
            nextStep = 29;
            botResponseText = 'Perfecto. Tu reporte ha sido registrado y transferido a un agente. Por favor, espera mientras se conecta un agente para ayudarte.';
          } else if (normalizedMessage === 'no') {
            nextStep = 27;
            botResponseText = '¿Qué campo necesitas corregir?';
          } else {
            nextStep = 26;
            botResponseText = '¿Los datos del reporte están correctos?';
          }
        } else if (currentStep === 27) {
          // Usuario selecciona qué campo corregir
          nextFormData.correctionField = message;
          nextStep = 28;
          if (message === 'Usuario') {
            botResponseText = 'Por favor, ingresa el usuario correcto:';
          } else if (message === 'Tote') {
            botResponseText = 'Por favor, ingresa el número de tote correcto:';
          } else if (message === 'Stock ID') {
            botResponseText = 'Por favor, ingresa el Stock ID correcto:';
          } else {
            nextStep = 27;
            botResponseText = '¿Qué campo necesitas corregir?';
          }
        } else if (currentStep === 28) {
          // Usuario corrige el campo seleccionado
          if (nextFormData.correctionField === 'Usuario') {
            nextFormData.user = message;
          } else if (nextFormData.correctionField === 'Tote') {
            nextFormData.toteNo = message;
          } else if (nextFormData.correctionField === 'Stock ID') {
            nextFormData.stockID = message;
          }
          nextStep = 26; // Pasar directamente al step de confirmación
          botResponseText = `¡Gracias! Aquí está el resumen actualizado de tu reporte de SOBRANTE:\n\n👤 Usuario: ${nextFormData.user}\n📦 Tote: ${nextFormData.toteNo}\n🔢 Stock ID: ${nextFormData.stockID}`;
          
          // Enviar automáticamente la pregunta de confirmación después del resumen actualizado
          setTimeout(async () => {
            const confirmationMessage: Message = {
              role: 'bot',
              text: '¿Los datos del reporte están correctos?',
            };
            await saveMessage(chatId, 'bot', confirmationMessage.text);
            setMessages((prev) => [...prev, confirmationMessage]);
          }, 500);
        } else if (currentStep === 29) {
          nextStep = 29;
          botResponseText = 'Tu reporte está siendo procesado. Un agente se conectará pronto.';
        }
      } else {
        // Default fallback para otros casos
        switch (nextStep) {
          case 0:
            botResponseText = "¡Hola! Soy tu asistente virtual de ESSILOR LUXOTTICA. ¿Qué problema tienes con el tote?";
            break;
          default:
            botResponseText = "Lo siento, no entiendo tu solicitud. Por favor, selecciona una de las opciones disponibles.";
        }
      }

      setCurrentStep(nextStep);
      setFormData(nextFormData);

      const botMessage: Message = { role: 'bot', text: botResponseText };
      await saveMessage(chatId, 'bot', botMessage.text);
      setMessages((prev) => [...prev, botMessage]);
      console.log('[useChat] Mensaje del bot enviado:', botMessage.text);

      // Transferir el chat al soporte humano si es necesario
      if (nextStep === 12 || nextStep === 29) {
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