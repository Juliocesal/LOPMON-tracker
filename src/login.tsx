import React, { useState } from 'react';
import { supabase } from './utils/supabaseClient';
import styles from './Login.module.css';
import { toast } from 'react-toastify'; // Importa el método `toast`
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
      } else {
        console.log('Usuario autenticado:', data.user);

        toast.success('Inicio de sesión Exitoso!', {
          position: 'top-right',
          autoClose: 2000,
          hideProgressBar: true,
          closeOnClick: false,
          pauseOnHover: false,
          draggable: false,
          theme: 'light',
          closeButton: false, // Esto elimina el botón X
        });

        // Usa navigate en lugar de window.location
        setTimeout(() => {
          navigate('/openpos');
        }, 2000); // 2000ms coincide con la duración de cierre automático del toast
      }
    } catch (err) {
      setError('Ocurrió un error inesperado. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles['body-container']}>
        <div className={styles['loading-container']}>
          <div className={styles['loading-content']}>
            <img src="/logo-essilor-luxottica.png" alt="Essilor Luxottica Logo" className={styles['loading-logo']} />
            <div className={styles['loading-spinner']}></div>
            <h2 className={styles['loading-title']}>Iniciando sesión...</h2>
            <p className={styles['loading-subtitle']}>Verificando tus credenciales</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['body-container']}>
      <div className={`${styles['page-login']} ${styles['login-container']}`}>
        <div className={styles['left-section']}>
          <h1>LOPMON TRACKER</h1>
          <p>
            <strong>LOPMON: Gestión Eficiente para Operaciones Logísticas</strong>
          </p>
          <p>
            LOPMON es una aplicación web diseñada para optimizar la gestión de incidencias, tickets operativos y procesos clave del área de inbound. Centraliza la comunicación, facilita el seguimiento de actividades y proporciona datos precisos para mejorar la eficiencia operativa.
          </p>
          <p><strong>Funcionalidades Principales</strong></p>
          
            <li><strong>Gestión de Incidencias:</strong> Crea, asigna y da seguimiento a tickets de manera estructurada con notificaciones automáticas.</li>
            <li><strong>Chat en Vivo:</strong> Resuelve dudas o problemas urgentes en tiempo real y genera tickets cuando sea necesario.</li>
            <li><strong>Optimización de Procesos:</strong> Módulos especializados para gestionar receiving, putaway y replenishment, con registros detallados para identificar áreas de mejora.</li>
            <li><strong>Datos en Tiempo Real:</strong> Accede a informes actualizados del área de inbound para tomar decisiones estratégicas.</li>
          
          <p><strong>Beneficios</strong></p>
          <ul>
            <li>Reduce tiempos de respuesta y mejora la productividad.</li>
            <li>Facilita la comunicación entre equipos.</li>
            <li>Proporciona visibilidad completa para optimizar recursos y ajustar procesos.</li>
          </ul>
          <p>
            LOPMON es ideal para empresas que buscan mejorar la coordinación y control en sus operaciones logísticas, transformando cada proceso en una operación más eficiente y precisa.
          </p>
        </div>
        <div className={styles['right-section']}>
          <img src="/logo-essilor-luxottica.png" alt="Essilor Luxottica Logo" className={styles['logo']} />
          <h2>Bienvenido a LopMon Tracker</h2>
          <p>Ingresa tus credenciales para acceder a tu cuenta</p>
          {error && <p className={styles['error-message']}>{error}</p>}
          <form onSubmit={handleSubmit}>
            <div className={styles['input-group']}>
              <i className="fas fa-envelope"></i>
              <input
                type="email"
                placeholder="Ingresa tu correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className={styles['input-group']}>
              <i className="fas fa-lock"></i>
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit">Iniciar sesión</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;