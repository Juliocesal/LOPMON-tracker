// src/hooks/types.ts
export interface Message {
  role: 'bot' | 'user' | 'agent';
  text: string;
}

export interface SupabasePayload {
  new: Message; // El objeto "new" contiene un mensaje
}

// Tipos para el sistema de tickets
export interface Ticket {
  id: string;
  id_incremental?: number; // ID incremental de la base de datos
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  location?: string;
  tote_number?: string;
  stock_id?: string;
  chat_id?: string;
  type?: string;
  user?: string; // Operador que crea el ticket
  created_by?: string; // Agente que creó el ticket
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  customer_name?: string;
  customer_email?: string;
  category?: string;
  resolution?: string;
  due_date?: string;
}

export interface TicketFilter {
  status?: string;
  type?: string;
  location?: string;
  user?: string;
  created_by?: string;
  tote_number?: string;
  stock_id?: string;
  search?: string;
  priority?: string;
  category?: string;
  assigned_to?: string;
}

export interface TicketStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  high_priority: number;
  overdue: number;
}