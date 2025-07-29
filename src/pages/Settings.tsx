

import React, { useState, useEffect } from 'react';
import Loading from '../components/Loading';
import NotificationSettings from '../components/NotificationSettings';
import { useNotifications } from '../contexts/NotificationContext';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const { 
    notifyNewChat, 
    notifyNewMessage, 
    notifyUrgent, 
    notifyInfo, 
    notifySuccess, 
    notifyWarning, 
    notifyError,
    clearAllNotifications
  } = useNotifications();

  useEffect(() => {
    // Simulate loading time for settings
    const timer = setTimeout(() => {
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Funciones de demostración
  const testNewChat = () => {
    notifyNewChat('demo-chat-123', 'Chat de demostración iniciado por Juan Pérez');
  };

  const testNewMessage = () => {
    notifyNewMessage('demo-chat-123', 'Ana García', 'Hola, necesito ayuda con mi pedido urgente...');
  };

  const testUrgent = () => {
    notifyUrgent('demo-chat-urgent', 'Cliente reporta problema crítico en el sistema');
  };

  const testInfo = () => {
    notifyInfo('Esta es una notificación informativa de ejemplo');
  };

  const testSuccess = () => {
    notifySuccess('Operación completada exitosamente');
  };

  const testWarning = () => {
    notifyWarning('Advertencia: Se detectó actividad inusual');
  };

  const testError = () => {
    notifyError('Error: No se pudo conectar al servidor');
  };

  if (loading) {
    return <Loading message="Cargando configuraciones..." />;
  }

  return (
    <div className="section" style={{ padding: '24px', maxWidth: '800px' }}>
      <h1 style={{ marginBottom: '24px', fontSize: '2rem', fontWeight: 'bold' }}>
        Configuraciones
      </h1>
      
      {/* Sección de Notificaciones */}
      <div style={{ 
        background: 'white', 
        padding: '24px', 
        borderRadius: '12px', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <h2 style={{ marginBottom: '16px', fontSize: '1.5rem', fontWeight: '600' }}>
          🔔 Sistema de Notificaciones
        </h2>
        
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '1.1rem', fontWeight: '500' }}>
            Controles de Notificaciones
          </h3>
          <NotificationSettings showLabels={true} />
        </div>

        <div>
          <h3 style={{ marginBottom: '12px', fontSize: '1.1rem', fontWeight: '500' }}>
            Probar Notificaciones
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '12px',
            marginBottom: '16px'
          }}>
            <button
              onClick={testNewChat}
              style={{
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #10b981, #34d399)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              🆕 Nuevo Chat
            </button>
            
            <button
              onClick={testNewMessage}
              style={{
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              💬 Nuevo Mensaje
            </button>
            
            <button
              onClick={testUrgent}
              style={{
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #ef4444, #f87171)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              🚨 Urgente
            </button>
            
            <button
              onClick={testSuccess}
              style={{
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              ✅ Éxito
            </button>
            
            <button
              onClick={testWarning}
              style={{
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #ea580c, #f97316)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              ⚠️ Advertencia
            </button>
            
            <button
              onClick={testError}
              style={{
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              ❌ Error
            </button>
            
            <button
              onClick={testInfo}
              style={{
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              ℹ️ Información
            </button>
            
            <button
              onClick={clearAllNotifications}
              style={{
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #64748b, #94a3b8)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              🗑️ Limpiar Todo
            </button>
          </div>
        </div>
      </div>

      {/* Otras configuraciones */}
      <div style={{ 
        background: 'white', 
        padding: '24px', 
        borderRadius: '12px', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginBottom: '16px', fontSize: '1.5rem', fontWeight: '600' }}>
          ⚙️ Otras Configuraciones
        </h2>
        <p style={{ color: '#6b7280', lineHeight: '1.5' }}>
          Aquí puedes agregar más configuraciones para tu aplicación como preferencias de usuario, 
          configuraciones de cuenta, temas, idiomas, etc.
        </p>
      </div>
    </div>
  );
};

export default Settings;