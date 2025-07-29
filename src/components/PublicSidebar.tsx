// src/components/PublicSidebar.tsx
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';

const PublicSidebar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when clicking outside or pressing escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const sidebar = document.querySelector('.sidebar');
      const button = document.querySelector('.mobile-menu-button');
      
      if (
        isMobileMenuOpen &&
        sidebar &&
        !sidebar.contains(e.target as Node) &&
        button &&
        !button.contains(e.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  // Close mobile menu when route changes
  const handleNavClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className={`mobile-menu-button ${isMobileMenuOpen ? 'sidebar-open' : ''}`}
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle menu"
      >
        <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
      </button>

      {/* Sidebar Overlay for Mobile */}
      <div 
        className={`sidebar-overlay ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar public-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="spacer"></div>
        {/* Encabezado */}
        <div className="header">
          <h2>EssilorLuxottica</h2>
          <h4>LopMon Tracker</h4>
        </div>

        <div className="spacer"></div>

        {/* Menú principal */}
        <nav className="menu">
          {/* Sección GENERAL */}
          <section>
            <h3 className="section-title">GENERAL</h3>
            <ul>
              <li>
                <NavLink 
                  to="/chat" 
                  className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
                  onClick={handleNavClick}
                >
                  <i className="fas fa-comments"></i>
                  Chat
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/exception-storage" 
                  className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
                  onClick={handleNavClick}
                >
                  <i className="fas fa-warehouse"></i>
                  Exception storage
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
                  to="/openposOp" 
                  className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
                  onClick={handleNavClick}
                >
                  <i className="fas fa-thumbtack"></i>
                  Open POs
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
                  onClick={handleNavClick}
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
                  to="/hxh-inbound" 
                  className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
                  onClick={handleNavClick}
                >
                  <i className="fas fa-chart-line"></i>
                  HxH Inbound
                </NavLink>
              </li>
            </ul>
          </section>
        </nav>
      </aside>
    </>
  );
};

export default PublicSidebar;