// src/utils/chatFlowTest.ts
// Script de utilidad para probar el flujo del chat

export interface ChatFlowStep {
  step: number;
  expectedMessage: string;
  userInput: string;
  nextStep: number;
  problemType?: string;
}

export const faltanteFlow: ChatFlowStep[] = [
  {
    step: 0,
    expectedMessage: "¡Hola! Soy tu asistente virtual de ESSILOR LUXOTTICA. ¿Qué problema tienes con el tote?",
    userInput: "Me falta material",
    nextStep: 1,
    problemType: "Me falta material"
  },
  {
    step: 1,
    expectedMessage: "Vamos a registrar un FALTANTE. Por favor, responde con la siguiente información. ✅\n\nPrimero, ¿cuál es tu Usuario?",
    userInput: "Juan123",
    nextStep: 2
  },
  {
    step: 2,
    expectedMessage: "Gracias, Juan123. Ahora dime, ¿cuál es la ubicación (locación) donde notaste el faltante?",
    userInput: "A1-B2-C3",
    nextStep: 3
  },
  {
    step: 3,
    expectedMessage: "La ubicación (A1-B2-C3) está correctamente escrita?",
    userInput: "Sí",
    nextStep: 4
  },
  {
    step: 4,
    expectedMessage: "Perfecto. Ahora dime, ¿cuál es el Stock ID del material que hace falta?",
    userInput: "SK12345",
    nextStep: 5
  },
  {
    step: 5,
    expectedMessage: "El Stock ID (SK12345) es correcto?",
    userInput: "Sí",
    nextStep: 6
  },
  {
    step: 6,
    expectedMessage: "Finalmente, ¿cuál es el número de TOTE relacionado con este faltante?",
    userInput: "T-001",
    nextStep: 7
  },
  {
    step: 7,
    expectedMessage: "El tote (T-001) es correcto?",
    userInput: "Sí",
    nextStep: 8
  },
  {
    step: 8,
    expectedMessage: "¡Gracias! Aquí está el resumen de tu reporte de FALTANTE:\n\n👤 Usuario: Juan123\n📍 Ubicación: A1-B2-C3\n🔢 Stock ID: SK12345\n📦 Tote: T-001",
    userInput: "",
    nextStep: 9
  },
  {
    step: 9,
    expectedMessage: "Estamos registrando tu incidencia. Espera una respuesta por favor.\nSi no respondemos en un minuto, se generará un ticket automático.",
    userInput: "",
    nextStep: 9 // Transfer to agent
  }
];

export const sobranteFlow: ChatFlowStep[] = [
  {
    step: 0,
    expectedMessage: "¡Hola! Soy tu asistente virtual de ESSILOR LUXOTTICA. ¿Qué problema tienes con el tote?",
    userInput: "Me sobro material",
    nextStep: 10,
    problemType: "Me sobro material"
  },
  {
    step: 10,
    expectedMessage: "Veo que quieres reportar un SOBRANTE. Vamos a registrar la información necesaria. ✅\n\nPrimero, ¿puedes darme tu usuario?",
    userInput: "Maria456",
    nextStep: 11
  },
  {
    step: 11,
    expectedMessage: "Gracias, Maria456. Ahora dime, ¿cuál es el número de TOTE donde encontraste el sobrante?",
    userInput: "T-002",
    nextStep: 12
  },
  {
    step: 12,
    expectedMessage: "El número de tote (T-002) es correcto?",
    userInput: "Sí",
    nextStep: 13
  },
  {
    step: 13,
    expectedMessage: "Perfecto. Ahora, por favor dime el Stock ID del material que está sobrando.",
    userInput: "SK67890",
    nextStep: 14
  },
  {
    step: 14,
    expectedMessage: "El Stock ID (SK67890) es correcto?",
    userInput: "Sí",
    nextStep: 15
  },
  {
    step: 15,
    expectedMessage: "¡Gracias! Aquí está el resumen de tu reporte de SOBRANTE:\n\n👤 Usuario: Maria456\n📦 Tote: T-002\n🔢 Stock ID: SK67890",
    userInput: "",
    nextStep: 16
  },
  {
    step: 16,
    expectedMessage: "Vamos a procesar tu reporte. Espera una respuesta por favor.\nSi no respondemos en un minuto, se generará un ticket automático.",
    userInput: "",
    nextStep: 16 // Transfer to agent
  }
];

// Función para validar el flujo
export const validateChatFlow = (flow: ChatFlowStep[], currentStep: number, botMessage: string): boolean => {
  const expectedStep = flow.find(step => step.step === currentStep);
  if (!expectedStep) {
    console.error(`Paso ${currentStep} no encontrado en el flujo`);
    return false;
  }
  
  if (botMessage.trim() !== expectedStep.expectedMessage.trim()) {
    console.error(`Mensaje del bot no coincide en el paso ${currentStep}`);
    console.error(`Esperado: "${expectedStep.expectedMessage}"`);
    console.error(`Recibido: "${botMessage}"`);
    return false;
  }
  
  return true;
};

// Función para obtener el siguiente input del usuario
export const getNextUserInput = (flow: ChatFlowStep[], currentStep: number): string => {
  const currentStepData = flow.find(step => step.step === currentStep);
  return currentStepData?.userInput || '';
};
