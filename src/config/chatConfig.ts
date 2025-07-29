// src/config/chatConfig.ts
// Configuración centralizada para el sistema de chat

export const CHAT_CONFIG = {
  // Mensajes del sistema
  SYSTEM_MESSAGES: {
    INITIAL: "¡Hola! Soy tu asistente virtual de ESSILOR LUXOTTICA. ¿Qué problema tienes con el tote?",
    FALTANTE_CONFIRM_SUMMARY: "¿Los datos del reporte están correctos?",
    SOBRANTE_CONFIRM_SUMMARY: "¿Los datos del reporte están correctos?",
    TRANSFER_FALTANTE: "Perfecto. Tu reporte ha sido registrado y transferido a un agente. Por favor, espera mientras se conecta un agente para ayudarte.",
    TRANSFER_SOBRANTE: "Perfecto. Tu reporte ha sido registrado y transferido a un agente. Por favor, espera mientras se conecta un agente para ayudarte.",
    FIELD_CORRECTION: "¿Qué campo necesitas corregir?",
    FALLBACK: "Lo siento, no entiendo tu solicitud. Por favor, selecciona una de las opciones disponibles.",
    CHAT_CLOSED: "🔒 Este chat ha sido cerrado por el agente.",
    AGENT_CONNECTED: "Agente conectado:",
    GENERATING_INCIDENT: "Generando Incidencia"
  },

  // Opciones de botones
  BUTTON_OPTIONS: {
    PROBLEM_TYPES: [
      "Me falta material",
      "Me sobro material"
    ],
    YES_NO: [
      "Sí",
      "No"
    ],
    FALTANTE_CORRECTION_FIELDS: [
      "Usuario",
      "Ubicación", 
      "Stock ID",
      "Tote"
    ],
    SOBRANTE_CORRECTION_FIELDS: [
      "Usuario",
      "Tote",
      "Stock ID"
    ]
  },

  // Patrones de detección para mostrar botones
  BUTTON_TRIGGERS: {
    SHOW_TYPE_OPTIONS: [
      "¿Qué problema tienes con el tote?",
      "Por favor, selecciona el tipo de problema"
    ],
    SHOW_YES_NO: [
      "está correctamente escrita?",
      "es correcto?",
      "¿Los datos del reporte están correctos?"
    ],
    SHOW_FALTANTE_CORRECTION: [
      "¿Qué campo necesitas corregir?"
    ]
  },

  // Pasos del flujo de chat
  CHAT_STEPS: {
    INITIAL: 0,
    // FALTANTE
    FALTANTE_START: 1,
    FALTANTE_USER: 1,
    FALTANTE_LOCATION: 2,
    FALTANTE_LOCATION_CONFIRM: 3,
    FALTANTE_STOCK_ID: 4,
    FALTANTE_STOCK_ID_CONFIRM: 5,
    FALTANTE_TOTE: 6,
    FALTANTE_TOTE_CONFIRM: 7,
    FALTANTE_SUMMARY: 8,
    FALTANTE_SUMMARY_CONFIRM: 9,
    FALTANTE_CORRECTION_SELECT: 10,
    FALTANTE_CORRECTION_INPUT: 11,
    FALTANTE_TRANSFER: 12,
    
    // SOBRANTE
    SOBRANTE_START: 20,
    SOBRANTE_USER: 20,
    SOBRANTE_TOTE: 21,
    SOBRANTE_TOTE_CONFIRM: 22,
    SOBRANTE_STOCK_ID: 23,
    SOBRANTE_STOCK_ID_CONFIRM: 24,
    SOBRANTE_SUMMARY: 25,
    SOBRANTE_SUMMARY_CONFIRM: 26,
    SOBRANTE_CORRECTION_SELECT: 27,
    SOBRANTE_CORRECTION_INPUT: 28,
    SOBRANTE_TRANSFER: 29
  },

  // Configuración de validación
  VALIDATION: {
    EMPTY_MESSAGE: "Por favor, ingresa un mensaje válido.",
    YES_VARIATIONS: ["si", "sí", "yes", "y"],
    NO_VARIATIONS: ["no", "n"],
    MAX_MESSAGE_LENGTH: 500,
    MIN_MESSAGE_LENGTH: 1
  },

  // Configuración de UI
  UI: {
    SCROLL_BEHAVIOR: "smooth" as ScrollBehavior,
    AUTO_SCROLL_DELAY: 100,
    LOADER_DELAY: 300
  },

  // Configuración de localStorage
  STORAGE_KEYS: {
    CURRENT_STEP: "chatCurrentStep",
    FORM_DATA: "chatFormData",
    CHAT_SESSION: "chatSession"
  }
};

// Función para obtener mensaje por clave
export const getMessage = (key: keyof typeof CHAT_CONFIG.SYSTEM_MESSAGES): string => {
  return CHAT_CONFIG.SYSTEM_MESSAGES[key];
};

// Función para validar entrada del usuario
export const validateUserInput = (message: string): { isValid: boolean; error?: string } => {
  if (!message || message.trim().length < CHAT_CONFIG.VALIDATION.MIN_MESSAGE_LENGTH) {
    return { isValid: false, error: CHAT_CONFIG.VALIDATION.EMPTY_MESSAGE };
  }
  
  if (message.length > CHAT_CONFIG.VALIDATION.MAX_MESSAGE_LENGTH) {
    return { isValid: false, error: `El mensaje es demasiado largo. Máximo ${CHAT_CONFIG.VALIDATION.MAX_MESSAGE_LENGTH} caracteres.` };
  }
  
  return { isValid: true };
};

// Función para normalizar respuestas de sí/no
export const normalizeYesNoResponse = (input: string): "sí" | "no" | null => {
  const normalized = input.toLowerCase().trim();
  
  if (CHAT_CONFIG.VALIDATION.YES_VARIATIONS.includes(normalized)) {
    return "sí";
  }
  
  if (CHAT_CONFIG.VALIDATION.NO_VARIATIONS.includes(normalized)) {
    return "no";
  }
  
  return null;
};
