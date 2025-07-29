// src/context/UserContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../utils/supabaseClient';

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
  avatar_url?: string; // Campo opcional para la URL de la imagen
}

interface UserContextProps {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export const UserContext = createContext<UserContextProps>({
  user: null,
  loading: true,
  error: null,
});

// Hook personalizado para acceder al contexto
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser debe ser usado dentro de un UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: React.ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Función para obtener el perfil del usuario
    const fetchUserProfile = async () => {
      try {
        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          // No hay sesión activa
          setError('No hay sesión activa.');
          return;
        }

        const userId = session.data.session.user.id;

        // Consultar la tabla user_profiles
        const { data, error: dbError } = await supabase
          .from('user_profiles')
          .select('id, full_name, role, avatar_url') // Incluye avatar_url
          .eq('id', userId)
          .single();

        if (dbError) {
          console.error('Error fetching user profile:', dbError);
          setError('No se pudo cargar el perfil del usuario.');
        } else if (data) {
          setUser(data as UserProfile);
        }
      } catch (err) {
        console.error('Error inesperado:', err);
        setError('Ocurrió un error inesperado.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();

    // Escuchar cambios en la autenticación (opcional)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        // Limpiar el estado del usuario al cerrar sesión
        setUser(null);
        setError(null);
      } else if (event === 'SIGNED_IN' && session) {
        // Volver a cargar el perfil del usuario al iniciar sesión
        fetchUserProfile();
      }
    });

    // Limpiar el listener cuando el componente se desmonta
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, error }}>
      {children}
    </UserContext.Provider>
  );
};