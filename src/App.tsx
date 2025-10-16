// src/App.tsx
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Loading from './components/Loading';
import './App.css';
import CreateTicket from './pages/CreateTicket';
import History from './pages/History';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Login from './login'; // Importamos el componente Login
import ProtectedRoute from './components/ProtectedRoute';
import { UserProvider, useUser } from './components/UserContext'; // Importamos el UserProvider y el hook useUser
import { NotificationProvider } from './contexts/NotificationContext'; // Importamos el NotificationProvider
import { ToastContainer } from 'react-toastify'; // Importa el contenedor de notificaciones
import 'react-toastify/dist/ReactToastify.css'; // Importa los estilos
import ChatPage from './pages/ChatPage'; // Importa la nueva página ChatPage
import AgentDashboard from './pages/AgentDashboard';
import PublicSidebar from './components/PublicSidebar'; // Import PublicSidebar
import HxHInbound from './components/hxh-inbound';
import ExceptionsTotes from './components/ExceptionsTotes';
import OpenPosOp from './components/OpenPosOp';
import TicketsPage from './pages/TicketsPage'; // Importar la página de tickets
import Overs from './components/Overs';
import Notifications from './components/notifications';
import ImportsTickets from './components/ImportsTickets';
import Dashboard from './components/Dashboard';

// Usa React.lazy para cargar OpenPos dinámicamente
const OpenPos = React.lazy(() => import('./pages/OpenPos'));

const AppContent: React.FC = () => {
  const { user } = useUser();
  const location = useLocation(); // Hook para obtener la ubicación actual

  // Determinar qué Sidebar mostrar
  const publicRoutes = ['/chat', '/exception-storage', '/openpos', '/openposOp', '/exceptions-totes', '/hxh-inbound'];
  const showPublicSidebar = !user && publicRoutes.includes(location.pathname);
  const showPrivateSidebar = user;

  return (
    <div className="app-container">
      {/* Mostrar el Sidebar correspondiente */}
      {showPublicSidebar && <PublicSidebar />}
      {showPrivateSidebar && <Sidebar />}

      <main className={showPublicSidebar ? "content with-public-sidebar" : showPrivateSidebar ? "content with-sidebar" : "content"}>
        <Suspense fallback={<Loading message="Cargando página..." />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/openpos" />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/openposOp" element={<OpenPosOp />} />
            <Route path="/exceptions-totes" element={<ExceptionsTotes />} />
            <Route path="/hxh-inbound" element={<HxHInbound />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Navigate replace to="/view-tickets" />} />
              <Route path="/view-tickets" element={<TicketsPage />} />
              <Route path="/Overs" element={<Overs/>} />
              <Route path="/history" element={<History />} />
              <Route path="/openpos" element={<OpenPos />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/create-ticket" element={<CreateTicket />} />
              <Route path="/agent-dashboard" element={<AgentDashboard />} />
              <Route path="/notifications" element={<Notifications/>} />
              <Route path="/imports-tickets" element={<ImportsTickets/>} />
              <Route path="/dashboard" element={<Dashboard/>} />
            </Route>

            {/* Redirección por defecto */}
            <Route path="*" element={<Navigate to={user ? "/openpos" : "/login"} />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <UserProvider> {/* Envuelve toda la aplicación con el UserProvider */}
      <NotificationProvider> {/* Envuelve con el NotificationProvider para notificaciones globales */}
        <Router>
          <AppContent />
          {/* Contenedor de notificaciones */}
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            toastStyle={{
              maxWidth: '400px',
              zIndex: 9999,
            }}
          />
        </Router>
      </NotificationProvider>
    </UserProvider>
  );
};

export default App;