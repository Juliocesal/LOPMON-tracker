// src/components/ChatInput.tsx
import { useState } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  options?: string[]; // Opciones disponibles para el usuario
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, options }) => {
  const [input, setInput] = useState('');

  // Si hay opciones, muestra botones
  if (options && options.length > 0) {
    return (
      <div className="flex gap-2">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => onSendMessage(option)}
            className="bg-blue-500 text-white p-2 rounded"
          >
            {option}
          </button>
        ))}
      </div>
    );
  }

  // Manejar el envío del mensaje
  const handleSendMessage = () => {
    if (!input.trim()) return; // Evitar enviar mensajes vacíos
    onSendMessage(input); // Enviar el mensaje
    setInput(''); // Limpiar el campo de entrada
  };

  // Manejar el evento de presionar una tecla
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Evitar el comportamiento predeterminado del Enter
      handleSendMessage(); // Enviar el mensaje
    }
  };

  // Si no hay opciones, muestra un campo de texto
  return (
    <div className="flex">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)} // Actualizar el estado del input
        onKeyDown={handleKeyDown} // Detectar el evento de teclado
        className="flex-1 p-2 border rounded-l-lg focus:outline-none"
        placeholder="Escribe un mensaje..."
      />
      <button
        onClick={handleSendMessage} // Enviar el mensaje al hacer clic
        className="p-2 bg-blue-500 text-white rounded-r-lg"
      >
        Enviar
      </button>
    </div>
  );
};

export default ChatInput;