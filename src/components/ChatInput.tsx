// src/components/ChatInput.tsx
import { useState } from 'react';
import ImageUpload from './ImageUpload';

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
    <div className="chat-input-form">
      <ImageUpload onImageUploaded={onSendMessage} />
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        className="chat-text-input"
        placeholder="Escribe un mensaje..."
      />
      <button
        onClick={handleSendMessage}
        disabled={!input.trim()}
        className="send-button"
      >
        <svg width="20" height="20" viewBox="10 0 10 20" fill="none">
                      <path d="M3 17L17 10L3 3V8L13 10L3 12V17Z" fill="currentColor"/>
                    </svg>
      </button>
    </div>
  );
};

export default ChatInput;