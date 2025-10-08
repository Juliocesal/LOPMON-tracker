// src/utils/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      storage: localStorage
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      }
    }
  }
);

// Setup auth state listener
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    localStorage.setItem('supabase_session', JSON.stringify(session));
  } else if (event === 'SIGNED_OUT') {
    localStorage.removeItem('supabase_session');
  }
});