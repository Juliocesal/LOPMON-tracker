// src/components/NotificationSettings.tsx
import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import './NotificationSettings.css';

interface NotificationSettingsProps {
  showLabels?: boolean;
  compact?: boolean;
  className?: string;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ 
  showLabels = false, 
  compact = false,
  className = ''
}) => {
  const { settings, updateSettings } = useNotifications();

  return (
    <div className={`notification-settings ${compact ? 'compact' : ''} ${className}`}>
      {/* Control de notificaciones visuales */}
      <button
        className={`notification-control ${settings.visualEnabled ? 'active' : ''}`}
        onClick={() => updateSettings({ visualEnabled: !settings.visualEnabled })}
        title="Activar/Desactivar notificaciones visuales"
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
          {settings.visualEnabled ? (
            <path d="M10 2C12.21 2 14 3.79 14 6V11L16 13H4L6 11V6C6 3.79 7.79 2 10 2ZM8 17C8 18.1 8.9 19 10 19S12 18.1 12 17" 
                  fill="currentColor"/>
          ) : (
            <>
              <path d="M10 2C12.21 2 14 3.79 14 6V11L16 13H4L6 11V6C6 3.79 7.79 2 10 2ZM8 17C8 18.1 8.9 19 10 19S12 18.1 12 17" 
                    fill="currentColor" opacity="0.3"/>
              <path d="M3 3L17 17" stroke="currentColor" strokeWidth="2"/>
            </>
          )}
        </svg>
        {showLabels && <span>Notificaciones</span>}
      </button>
      
      {/* Control de sonido */}
      <button
        className={`notification-control ${settings.soundEnabled ? 'active' : ''}`}
        onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
        title="Activar/Desactivar sonido"
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
          {settings.soundEnabled ? (
            <path d="M9 4L6 7H3V13H6L9 16V4ZM13 8C13.55 8.45 14 9.2 14 10S13.55 11.55 13 12M15.5 5.5C16.96 6.96 17.5 9 17.5 10S16.96 13.04 15.5 14.5" 
                  stroke="currentColor" strokeWidth="1.5" fill="none"/>
          ) : (
            <>
              <path d="M9 4L6 7H3V13H6L9 16V4Z" fill="currentColor" opacity="0.3"/>
              <path d="M3 3L17 17" stroke="currentColor" strokeWidth="2"/>
            </>
          )}
        </svg>
        {showLabels && <span>Sonido</span>}
      </button>

      {/* Control de notificaciones del navegador */}
      <button
        className={`notification-control ${settings.browserNotificationsEnabled ? 'active' : ''}`}
        onClick={() => updateSettings({ browserNotificationsEnabled: !settings.browserNotificationsEnabled })}
        title="Activar/Desactivar notificaciones del navegador"
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
          {settings.browserNotificationsEnabled ? (
            <path d="M4 4V16H16V4H4ZM2 2H18C18.55 2 19 2.45 19 3V17C19 17.55 18.55 18 18 18H2C1.45 18 1 17.55 1 17V3C1 2.45 1.45 2 2 2Z" 
                  fill="currentColor"/>
          ) : (
            <>
              <path d="M4 4V16H16V4H4ZM2 2H18C18.55 2 19 2.45 19 3V17C19 17.55 18.55 18 18 18H2C1.45 18 1 17.55 1 17V3C1 2.45 1.45 2 2 2Z" 
                    fill="currentColor" opacity="0.3"/>
              <path d="M3 3L17 17" stroke="currentColor" strokeWidth="2"/>
            </>
          )}
        </svg>
        {showLabels && <span>Navegador</span>}
      </button>
    </div>
  );
};

export default NotificationSettings;
