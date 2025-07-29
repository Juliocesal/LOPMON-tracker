// src/utils/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jbasdsogljwsirdzfifc.supabase.co'; // Reemplaza con tu URL de Supabase
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiYXNkc29nbGp3c2lyZHpmaWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzMDk2MDIsImV4cCI6MjA2Mzg4NTYwMn0.bKlWcvq86sLtg_FsGEXP2hTXYhNkVkhkCadhmpZ1v3w'; // Reemplaza con tu clave pública

export const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    }
  }
});