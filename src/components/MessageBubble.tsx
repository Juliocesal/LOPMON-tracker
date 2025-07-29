// src/components/MessageBubble.tsx

interface MessageBubbleProps {
  role: 'user' | 'agent' | 'bot'; // Quién envía el mensaje
  text: string;                   // Texto del mensaje
  created_at?: string;            // Hora opcional (ISO string)
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ role, text, created_at }) => {
  return (
    <div
      className={`p-3 rounded-lg max-w-[80%] mb-2
        ${role === 'user' ? 'bg-blue-500 text-white self-end' :
          role === 'agent' ? 'bg-green-200 text-gray-800 self-start' :
          'bg-gray-200 text-gray-800 self-start'}
      `}
    >
      <div>{text}</div>

      {/* Hora */}
      {created_at && (
        <div className={`text-xs mt-1 ${role === 'user' ? 'text-blue-100' : 'text-gray-500'} text-right`}>
          {new Date(created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
