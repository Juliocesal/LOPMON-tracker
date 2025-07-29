// src/utils/downloadConversation.ts
export const downloadConversation = (messages: any[], chatId: string) => {
  // Convertir los mensajes a un formato legible (por ejemplo, texto plano)
  const conversationText = messages
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.text}`)
    .join('\n\n');

  // Crear un Blob con el contenido
  const blob = new Blob([conversationText], { type: 'text/plain' });

  // Crear un enlace temporal para descargar el archivo
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `chat_${chatId}.txt`; // Nombre del archivo
  link.click();

  // Liberar el objeto URL
  URL.revokeObjectURL(url);
};