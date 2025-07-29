// src/api/chatApi.ts
import { supabase } from '../utils/supabaseClient'; // Asegúrate de que la ruta sea correcta
import { Ticket, TicketFilter, TicketStats } from '../hooks/types';

// Crear una nueva sesión de chat
// src/api/chatApi.ts
export const createChatSession = async (userId?: string) => {
  const { data, error } = await supabase
    .from('chats')
    .insert([{ user_id: userId, status: 'active' }])
    .select();

  if (error) throw error;
  return data[0]; // Devuelve el chat recién creado
};

// src/api/chatApi.ts
export const saveMessage = async (chatId: string, role: 'bot' | 'user' | 'agent', text: string) => {
  const { data, error } = await supabase
    .from('messages')
    .insert([{ chat_id: chatId, role, text }])
    .select();

  if (error) throw error;
  return data[0];
};

// Transferir el chat al soporte humano
export const transferChatToAgent = async (chatId: string) => {
  const { error } = await supabase
    .from('chats')
    .update({ status: 'transferred' })
    .eq('id', chatId);

  if (error) throw error;
};

// Crear un ticket si el problema no se resuelve
export const createTicket = async (chatId: string, title: string, description: string) => {
  const { data, error } = await supabase
    .from('tickets')
    .insert([{ chat_id: chatId, title, description }])
    .select();

  if (error) throw error;
  return data[0];
};

// FUNCIONES PARA EL SISTEMA DE TICKETS

// Obtener todos los tickets con filtros
export const getTickets = async (filters?: TicketFilter): Promise<Ticket[]> => {
  let query = supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.priority) {
    query = query.eq('priority', filters.priority);
  }
  if (filters?.category) {
    query = query.eq('category', filters.category);
  }
  if (filters?.assigned_to) {
    query = query.eq('assigned_to', filters.assigned_to);
  }
  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
};

// Obtener un ticket por ID
export const getTicketById = async (id: string): Promise<Ticket | null> => {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

// Crear un nuevo ticket
export const createNewTicket = async (ticket: Omit<Ticket, 'id' | 'created_at' | 'updated_at'>): Promise<Ticket> => {
  console.log('Creating ticket with data:', ticket);
  
  // Crear objeto base sin chat_id
  const ticketData: any = {
    status: ticket.status || 'open',
    location: ticket.location || null,
    tote_number: ticket.tote_number || null,
    stock_id: ticket.stock_id || null,
    type: ticket.type || 'general',
    user: ticket.user || null,
    created_by: ticket.created_by || null,
    title: ticket.title || null,
    description: ticket.description || null,
    priority: ticket.priority || 'medium'
  };
  
  // Solo agregar chat_id si se proporciona explícitamente
  if (ticket.chat_id) {
    ticketData.chat_id = ticket.chat_id;
  }

  console.log('Processed ticket data for insertion:', ticketData);

  try {
    const { data, error } = await supabase
      .from('tickets')
      .insert(ticketData)
      .select()
      .single();

    if (error) {
      console.error('Supabase insertion error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw new Error(`Error al crear ticket: ${error.message}`);
    }
    
    console.log('Successfully created ticket:', data);
    return data;
  } catch (error) {
    console.error('Unexpected error creating ticket:', error);
    throw error;
  }
};

// Actualizar un ticket
export const updateTicket = async (id: string, updates: Partial<Ticket>): Promise<Ticket> => {
  const { data, error } = await supabase
    .from('tickets')
    .update({ 
      ...updates, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Eliminar un ticket
export const deleteTicket = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('tickets')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Asignar ticket a un agente
export const assignTicket = async (id: string, agentId: string): Promise<Ticket> => {
  const { data, error } = await supabase
    .from('tickets')
    .update({ 
      assigned_to: agentId, 
      status: 'in_progress',
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Cambiar el estado de un ticket
export const changeTicketStatus = async (id: string, status: Ticket['status']): Promise<Ticket> => {
  const { data, error } = await supabase
    .from('tickets')
    .update({ 
      status, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Obtener estadísticas de tickets
export const getTicketStats = async (): Promise<TicketStats> => {
  console.log('Loading ticket stats...');
  
  const { data: tickets, error } = await supabase
    .from('tickets')
    .select('status, priority, created_at');

  if (error) {
    console.error('Error loading stats:', error);
    throw error;
  }

  console.log('Ticket stats loaded:', tickets?.length || 0, 'tickets');

  const now = new Date();
  const stats: TicketStats = {
    total: tickets?.length || 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
    high_priority: 0,
    overdue: 0
  };

  tickets?.forEach(ticket => {
    // Contar por estado
    stats[ticket.status as keyof TicketStats] = (stats[ticket.status as keyof TicketStats] as number) + 1;
    
    // Contar alta prioridad
    if (ticket.priority === 'high' || ticket.priority === 'urgent') {
      stats.high_priority++;
    }
    
    // Para overdue, usamos created_at como referencia (más de 24 horas)
    if (ticket.created_at) {
      const createdDate = new Date(ticket.created_at);
      const hoursDiff = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
      if (hoursDiff > 24 && ticket.status !== 'resolved' && ticket.status !== 'closed') {
        stats.overdue++;
      }
    }
  });

  console.log('Computed stats:', stats);
  return stats;
};