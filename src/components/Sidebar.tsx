// src/components/Sidebar.tsx
import React, { useContext, useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient'; // Asegúrate de que la ruta sea correcta
import { UserContext } from '../components/UserContext'; // Asegúrate de que la ruta sea correcta

const Sidebar: React.FC = () => {
  // Hook para navegar programáticamente
  const navigate = useNavigate();

  // Obtener el perfil del usuario desde el contexto
  const { user, loading } = useContext(UserContext);

  // Estado online/offline del usuario
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Detectar cambios en el estado de conexión
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Función para manejar el cierre de sesión
  const handleLogout = async () => {
    try {
      // Cerrar sesión con Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error al cerrar sesión:', error.message);
      } else {
        console.log('Sesión cerrada correctamente');
        // Redirigir al usuario a la página de login
        navigate('/login');
      }
    } catch (err) {
      console.error('Error inesperado al cerrar sesión:', err);
    }
  };

  return (
    <aside className="sidebar">
      {/* Encabezado */}
      <div className="header">
        <h2>EssilorLuxottica</h2>
        <h4>LopMon Tracker</h4>
      </div>

      {/* Perfil de usuario */}
      <div className="user-profile">
        <div className="profile-image-container">
          <img
            src={user?.avatar_url || '/default-avatar.png'} // Usa una imagen por defecto si no hay avatar
            alt="User Profile"
            className="profile-image"
          />
          <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`}></div>
        </div>
        <div className="profile-info">
          {loading ? (
            <span>Cargando...</span>
          ) : user ? (
            <>
              <span className="username">{user.full_name}</span>
              <span className="role">{user.role}</span>
            </>
          ) : (
            <span>No se encontró el perfil del usuario.</span>
          )}
        </div>
      </div>

      {/* Menú principal */}
      <nav className="menu">
        {/* Sección GENERAL */}
        <section>
          <h3 className="section-title">GENERAL</h3>
          <ul>
            <li>
              <NavLink 
                to="/view-tickets" 
                className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
              >
                <i className="fa fa-inbox"></i>
                Open Tickets
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/agent-dashboard" 
                className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
              >
                <i className="fas fa-comments"></i>
                Chat
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/Overs" 
                className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
              >
                <i className="fas fa-warehouse"></i>
                Registro de overs
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/notifications" 
                className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
              >
                <i className="fas fa-bell"></i>
                Notifications
              </NavLink>
            </li>
          </ul>
        </section>

        {/* Sección Receiving */}
        <section className="receiving-section">
          <h3 className="section-title">Receiving</h3>
          <ul>
            <li>
              <NavLink 
                to="/openpos" 
                className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
              >
                <i className="fas fa-thumbtack"></i>
                Open POs
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/imports-tickets" 
                className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
              >
                <i className="fas fa-box"></i>
                Imports Tickets
              </NavLink>
            </li>
          </ul>
        </section>

        {/* Sección Putaway */}
        <section className="putaway-section">
          <h3 className="section-title">Putaway</h3>
          <ul>
            <li>
              <NavLink 
                to="/exceptions-totes" 
                className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
              >
                <i className="fas fa-box-open"></i>
                Exceptions totes
              </NavLink>
            </li>
          </ul>
        </section>

        {/* Sección ADMINISTRATION */}
        <section>
          <h3 className="section-title">ADMINISTRATION</h3>
          <ul>
            <li>
              <NavLink 
                to="/dashboard" 
                className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
              >
                <i className="fas fa-chart-pie"></i>
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/hxh-inbound" 
                className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
              >
                <i className="fas fa-chart-line"></i>
                HxH Inbound
              </NavLink>
            </li>
          </ul>
        </section>
      </nav>

      {/* Botón de Cerrar Sesión */}
      <footer className="footer">
        <button className="logout-btn" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt"></i>
          Cerrar sesión
        </button>
      </footer>
    </aside>
  );
};

export default Sidebar;