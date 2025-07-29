// import React from 'react'; // Comentado porque no se usa sin StrictMode
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode> // Comentado temporalmente para evitar doble inicialización de chats
    <App />
  // </React.StrictMode>
);