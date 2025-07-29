// src/hooks/useTickets.ts
import { useState, useEffect, useCallback } from 'react';
import { Ticket, TicketFilter, TicketStats } from './types';
import { 
  getTickets, 
  getTicketStats, 
  createNewTicket, 
  updateTicket, 
  deleteTicket, 
  changeTicketStatus,
  assignTicket 
} from '../api/ChatApi';

export const useTickets = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTickets = useCallback(async (filters?: TicketFilter) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTickets(filters);
      setTickets(data);
    } catch (err) {
      setError('Error al cargar los tickets');
      console.error('Error loading tickets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await getTicketStats();
      setStats(data);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }, []);

  const createTicket = useCallback(async (ticketData: Omit<Ticket, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newTicket = await createNewTicket(ticketData);
      setTickets(prev => [newTicket, ...prev]);
      await loadStats();
      return newTicket;
    } catch (err) {
      setError('Error al crear el ticket');
      throw err;
    }
  }, [loadStats]);

  const editTicket = useCallback(async (id: string, updates: Partial<Ticket>) => {
    try {
      const updatedTicket = await updateTicket(id, updates);
      setTickets(prev => prev.map(ticket => 
        ticket.id === id ? updatedTicket : ticket
      ));
      await loadStats();
      return updatedTicket;
    } catch (err) {
      setError('Error al actualizar el ticket');
      throw err;
    }
  }, [loadStats]);

  const removeTicket = useCallback(async (id: string) => {
    try {
      await deleteTicket(id);
      setTickets(prev => prev.filter(ticket => ticket.id !== id));
      await loadStats();
    } catch (err) {
      setError('Error al eliminar el ticket');
      throw err;
    }
  }, [loadStats]);

  const updateTicketStatus = useCallback(async (id: string, status: Ticket['status']) => {
    try {
      const updatedTicket = await changeTicketStatus(id, status);
      setTickets(prev => prev.map(ticket => 
        ticket.id === id ? updatedTicket : ticket
      ));
      await loadStats();
      return updatedTicket;
    } catch (err) {
      setError('Error al cambiar el estado del ticket');
      throw err;
    }
  }, [loadStats]);

  const assignTicketToAgent = useCallback(async (id: string, agentId: string) => {
    try {
      const updatedTicket = await assignTicket(id, agentId);
      setTickets(prev => prev.map(ticket => 
        ticket.id === id ? updatedTicket : ticket
      ));
      await loadStats();
      return updatedTicket;
    } catch (err) {
      setError('Error al asignar el ticket');
      throw err;
    }
  }, [loadStats]);

  const refreshData = useCallback(async (filters?: TicketFilter) => {
    await Promise.all([
      loadTickets(filters),
      loadStats()
    ]);
  }, [loadTickets, loadStats]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    tickets,
    stats,
    loading,
    error,
    loadTickets,
    loadStats,
    createTicket,
    editTicket,
    removeTicket,
    updateTicketStatus,
    assignTicketToAgent,
    refreshData,
    clearError: () => setError(null)
  };
};
