// src/contexts/NotificationContext.tsx
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import './NotificationContext.css';

interface NotificationData {
  id: string;
  type: 'new-chat' | 'message' | 'urgent' | 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  chatId?: string;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
    type?: 'primary' | 'secondary';
  }>;
}

interface NotificationContextType {
  notifications: NotificationData[];
  addNotification: (notification: Omit<NotificationData, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  notifyNewChat: (chatId: string, message?: string) => void;
  notifyNewMessage: (chatId: string, senderName: string, preview: string) => void;
  notifyUrgent: (chatId: string, message: string) => void;
  notifyInfo: (message: string) => void;
  notifySuccess: (message: string) => void;
  notifyWarning: (message: string) => void;
  notifyError: (message: string) => void;
  settings: {
    soundEnabled: boolean;
    visualEnabled: boolean;
    browserNotificationsEnabled: boolean;
  };
  updateSettings: (settings: Partial<NotificationContextType['settings']>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: React.ReactNode;
  onNotificationClick?: (chatId: string) => void;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ 
  children, 
  onNotificationClick 
}) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState({
    soundEnabled: true,
    visualEnabled: true,
    browserNotificationsEnabled: true
  });
  // Ref for HTMLAudioElement for playing notification sound file (for new-chat only)
  const audioFileRef = useRef<HTMLAudioElement | null>(null);

  // Solicitar permisos de notificación al montar el componente
  useEffect(() => {
    const requestPermission = async () => {
      if ('Notification' in window) {
        const perm = await Notification.requestPermission();
        setPermission(perm);
      }
    };
    requestPermission();
  }, []);

  // Usar archivo de sonido para notificaciones de nuevo chat
  useEffect(() => {
    if (!audioFileRef.current) {
      const audio = new window.Audio('/new-notification-025-380251.mp3');
      audio.preload = 'auto';
      audioFileRef.current = audio;
    }
  }, []);

  // Oscillator-based sound for all types except 'new-chat'
  const playOscillatorSound = (type: string) => {
    if (!settings.soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      switch (type) {
        case 'message':
          oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
          break;
        case 'urgent':
        case 'error':
          oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.2);
          break;
        case 'success':
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.1);
          break;
        case 'warning':
          oscillator.frequency.setValueAtTime(700, audioContext.currentTime);
          break;
        default:
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      }
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    } catch (error) {
      console.warn('Error playing oscillator notification sound:', error);
    }
  };

  // Función para agregar notificación
  const addNotification = (data: Omit<NotificationData, 'id' | 'timestamp'>) => {
    const notification: NotificationData = {
      ...data,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      duration: data.duration || 5000
    };

    // Agregar a la lista de notificaciones visuales
    if (settings.visualEnabled) {
      setNotifications(prev => [notification, ...prev].slice(0, 10)); // Máximo 10 notificaciones
    }

    // Reproducir sonido: mp3 solo para 'new-chat', oscilador para los demás
    if (settings.soundEnabled) {
      if (data.type === 'new-chat' && audioFileRef.current) {
        try {
          audioFileRef.current.currentTime = 0;
          audioFileRef.current.play();
        } catch (error) {
          console.warn('Error playing notification sound:', error);
        }
      } else {
        playOscillatorSound(data.type);
      }
    }

    // Mostrar notificación del navegador
    if (permission === 'granted' && settings.browserNotificationsEnabled && settings.visualEnabled) {
      try {
        const browserNotification = new Notification(data.title, {
          body: data.message,
          icon: '/logo.PNG',
          tag: data.chatId || 'general',
          requireInteraction: data.type === 'urgent' || data.type === 'error'
        });

        browserNotification.onclick = () => {
          if (data.chatId && onNotificationClick) {
            onNotificationClick(data.chatId);
          }
          browserNotification.close();
          window.focus();
        };

        // Auto-cerrar notificación del navegador después de 5 segundos
        setTimeout(() => {
          browserNotification.close();
        }, 5000);
      } catch (error) {
        console.warn('Error showing browser notification:', error);
      }
    }

    // Auto-remover notificación visual después del tiempo especificado
    setTimeout(() => {
      removeNotification(notification.id);
    }, notification.duration!);

    return notification.id;
  };

  // Función para remover notificación
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Función para limpiar todas las notificaciones
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Función para actualizar configuración
  const updateSettings = (newSettings: Partial<NotificationContextType['settings']>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // Funciones específicas para diferentes tipos de notificaciones
  const notifyNewChat = (chatId: string, message: string = 'Nuevo chat iniciado') => {
    addNotification({
      type: 'new-chat',
      title: '🆕 Nuevo Chat',
      message,
      chatId,
      duration: 8000
    });
  };

  const notifyNewMessage = (chatId: string, senderName: string, preview: string) => {
    addNotification({
      type: 'message',
      title: `💬 Mensaje de ${senderName}`,
      message: preview.length > 50 ? preview.substring(0, 50) + '...' : preview,
      chatId,
      duration: 6000
    });
  };

  const notifyUrgent = (chatId: string, message: string) => {
    addNotification({
      type: 'urgent',
      title: '🚨 Urgente',
      message,
      chatId,
      duration: 10000
    });
  };

  const notifyInfo = (message: string) => {
    addNotification({
      type: 'info',
      title: 'ℹ️ Información',
      message,
      duration: 4000
    });
  };

  const notifySuccess = (message: string) => {
    addNotification({
      type: 'success',
      title: '✅ Éxito',
      message,
      duration: 4000
    });
  };

  const notifyWarning = (message: string) => {
    addNotification({
      type: 'warning',
      title: '⚠️ Advertencia',
      message,
      duration: 6000
    });
  };

  const notifyError = (message: string) => {
    addNotification({
      type: 'error',
      title: '❌ Error',
      message,
      duration: 8000
    });
  };

  const contextValue: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    notifyNewChat,
    notifyNewMessage,
    notifyUrgent,
    notifyInfo,
    notifySuccess,
    notifyWarning,
    notifyError,
    settings,
    updateSettings
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new-chat':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 13.54 2.38 14.95 3.04 16.19L2 22L7.81 20.96C9.05 21.62 10.46 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="currentColor"/>
            <path d="M8 12H16M12 8V16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
      case 'message':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 13.54 2.38 14.95 3.04 16.19L2 22L7.81 20.96C9.05 21.62 10.46 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="currentColor"/>
          </svg>
        );
      case 'urgent':
      case 'error':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" fill="currentColor"/>
          </svg>
        );
      case 'success':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="currentColor"/>
            <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'warning':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L22 20H2L12 2Z" fill="currentColor"/>
            <path d="M12 8V12M12 16H12.01" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
      default:
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="currentColor"/>
            <path d="M12 8V12L15 15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
    }
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      {/* Contenedor de notificaciones visuales */}
      {settings.visualEnabled && (
        <div className="global-notifications-container">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`global-notification global-notification--${notification.type}`}
              onClick={() => {
                if (notification.chatId && onNotificationClick) {
                  onNotificationClick(notification.chatId);
                }
                removeNotification(notification.id);
              }}
            >
              <div className="global-notification__icon">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="global-notification__content">
                <div className="global-notification__title">{notification.title}</div>
                <div className="global-notification__message">{notification.message}</div>
                <div className="global-notification__timestamp">
                  {notification.timestamp.toLocaleTimeString()}
                </div>
                {notification.actions && (
                  <div className="global-notification__actions">
                    {notification.actions.map((action, index) => (
                      <button
                        key={index}
                        className={`global-notification__action ${action.type || 'secondary'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          action.action();
                          removeNotification(notification.id);
                        }}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                className="global-notification__close"
                onClick={(e) => {
                  e.stopPropagation();
                  removeNotification(notification.id);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4L12 12M4 12L12 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      {/* Badge de contador de notificaciones */}
      {notifications.length > 0 && settings.visualEnabled && (
        <div className="global-notification-badge">
          {notifications.length}
        </div>
      )}
      {/* Hidden audio element for notification sound */}
      <audio ref={audioFileRef} src="/new-notification-025-380251.mp3" preload="auto" style={{ display: 'none' }} />
    </NotificationContext.Provider>
  );
};

// Hook personalizado para usar el sistema de notificaciones
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
