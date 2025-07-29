// src/hooks/useAutoTicketCreation.ts
import { useEffect } from 'react';
import { createTicket } from '../api/ChatApi';

const useAutoTicketCreation = (chatId: string) => {
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        await createTicket(chatId, "Problema técnico", "El usuario reporta un problema técnico.");
        console.log("Ticket creado automáticamente.");
      } catch (error) {
        console.error("Error al crear el ticket:", error);
      }
    }, 60000); // 1 minuto

    return () => clearTimeout(timer);
  }, [chatId]);
};

export default useAutoTicketCreation;