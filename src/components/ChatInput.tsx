// src/components/ChatInput.tsx
import { useState } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onImageUpload?: (file: File) => Promise<void>;
  isReconnecting?: boolean;
  uploadStatus?: string;
  onInputChange?: (value: string) => void; // Add new optional prop
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  onImageUpload,
  isReconnecting,
  uploadStatus,
  onInputChange 
}) => {
  const [message, setMessage] = useState('');

  // Manejar el envío del mensaje
  const handleSendMessage = () => {
    if (!message.trim()) return; // Evitar enviar mensajes vacíos
    onSendMessage(message); // Enviar el mensaje
    setMessage(''); // Limpiar el campo de entrada
  };

  // Manejar el evento de presionar una tecla
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Evitar el comportamiento predeterminado del Enter
      handleSendMessage(); // Enviar el mensaje
    }
  };

  // Update handleChange to use HTMLInputElement
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);
    // Call onInputChange if provided
    if (onInputChange) {
      onInputChange(value);
    }
  };

  return (
    <div className="chat-input-container">
      {/* Solo mostrar el indicador de reconexión si realmente estamos reconectando */}
      {isReconnecting && (
        <div className="reconnecting-indicator" style={{ 
          padding: '4px 8px',
          marginBottom: '8px',
          borderRadius: '4px',
          backgroundColor: '#fff3cd',
          color: '#856404',
          fontSize: '0.875rem'
        }}>
          <span>🔄 Reconectando...</span>
        </div>
      )}
      <div className="chat-input-form">
        {onImageUpload && (
          <div className="image-upload-buttons">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => e.target.files?.[0] && onImageUpload(e.target.files[0])}
              style={{ display: 'none' }}
              id="camera-input"
            />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => e.target.files?.[0] && onImageUpload(e.target.files[0])}
              style={{ display: 'none' }}
              id="file-input"
            />
            <button
              onClick={() => document.getElementById('camera-input')?.click()}
              className="image-button"
              type="button"
              title="Tomar foto"
              disabled={isReconnecting}
            >
              📷
            </button>
            <button
              onClick={() => document.getElementById('file-input')?.click()}
              className="image-button"
              type="button"
              title="Adjuntar imagen"
              disabled={isReconnecting}
            >
              📎
            </button>
          </div>
        )}
        <input
          type="text"
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="chat-text-input"
          placeholder="Escribe un mensaje..."
          disabled={isReconnecting}
        />
        <button
          onClick={handleSendMessage}
          disabled={!message.trim()}
          className="send-button"
        >
          <svg width="20" height="20" viewBox="10 0 10 20" fill="none">
            <path d="M3 17L17 10L3 3V8L13 10L3 12V17Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
      {uploadStatus && (
        <div className="upload-status">
          {uploadStatus}
        </div>
      )}
    </div>
  );
};

export default ChatInput;