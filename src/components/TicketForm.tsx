// src/components/TicketForm.tsx
import React, { useState, useEffect } from 'react';
import { Ticket } from '../hooks/types';
import { createNewTicket, updateTicket } from '../api/ChatApi';
import { useUser } from './UserContext';
import { supabase } from '../utils/supabaseClient';
import './TicketForm.css';

interface TicketFormProps {
  ticket?: Ticket | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const TicketForm: React.FC<TicketFormProps> = ({ ticket, onSuccess, onCancel }) => {
  const { user } = useUser();
  const [currentUserName, setCurrentUserName] = useState<string>('');
  
  const [formData, setFormData] = useState({
    location: ticket?.location || '',
    tote_number: ticket?.tote_number || '',
    stock_id: ticket?.stock_id || '',
    type: ticket?.type || 'general',
    user: ticket?.user || '',
    created_by: ticket?.created_by || '',
    title: ticket?.title || '',
    description: ticket?.description || ''
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Obtener el nombre del usuario autenticado
  useEffect(() => {
    const fetchUserName = async () => {
      if (user) {
        // Obtener el usuario de auth para acceder al email
        const { data: authData } = await supabase.auth.getUser();
        const userEmail = authData.user?.email || 'Usuario';
        
        setCurrentUserName(user.full_name || userEmail);
        
        // Si es un nuevo ticket, establecer el created_by automáticamente
        if (!ticket) {
          setFormData(prev => ({ 
            ...prev, 
            created_by: user.full_name || userEmail
          }));
        }
      }
    };

    fetchUserName();
  }, [user, ticket]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.location.trim()) {
      newErrors.location = 'La ubicación es requerida';
    }
    
    if (!formData.type.trim()) {
      newErrors.type = 'El tipo es requerido';
    }
    
    if (!formData.user.trim()) {
      newErrors.user = 'El usuario es requerido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      if (ticket) {
        // Editar ticket existente
        await updateTicket(ticket.id, formData);
      } else {
        // Crear nuevo ticket - usar solo los campos básicos necesarios
        const ticketData = {
          status: 'open',
          location: formData.location,
          tote_number: formData.tote_number || null,
          stock_id: formData.stock_id || null,
          type: formData.type,
          user: formData.user,
          created_by: formData.created_by,
          title: formData.title || null,
          description: formData.description || null,
          priority: 'medium'
          // No incluir chat_id para tickets creados manualmente
        };
        await createNewTicket(ticketData as any);
      }
      
      onSuccess();
    } catch (error) {
      // Mostrar error más específico si está disponible
      let errorMessage = 'Error al guardar el ticket. Por favor intenta de nuevo.';
      
      if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      } else if (typeof error === 'object' && error !== null) {
        if ('message' in error) {
          errorMessage = `Error: ${(error as any).message}`;
        } else if ('details' in error) {
          errorMessage = `Error: ${(error as any).details}`;
        } else if ('hint' in error) {
          errorMessage = `Error: ${(error as any).hint}`;
        }
      }
      
      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Limpiar error del campo cuando el usuario comience a escribir
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="ticket-form-container">
      <div className="ticket-form-header">
        <h2>{ticket ? 'Editar Ticket' : 'Crear Nuevo Ticket'}</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="ticket-form">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="location">Ubicación *</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className={errors.location ? 'error' : ''}
              placeholder="Ingresa la ubicación"
            />
            {errors.location && <span className="error-message">{errors.location}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="tote_number">Número Tote</label>
            <input
              type="text"
              id="tote_number"
              name="tote_number"
              value={formData.tote_number}
              onChange={handleChange}
              placeholder="Número del tote"
            />
          </div>

          <div className="form-group">
            <label htmlFor="stock_id">Stock ID</label>
            <input
              type="text"
              id="stock_id"
              name="stock_id"
              value={formData.stock_id}
              onChange={handleChange}
              placeholder="ID del stock"
            />
          </div>

          <div className="form-group">
            <label htmlFor="type">Tipo *</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              className={errors.type ? 'error' : ''}
            >
              <option value="">Selecciona un tipo</option>
              <option value="exception">Excepción</option>
              <option value="inventory">Inventario</option>
              <option value="technical">Técnico</option>
              <option value="general">General</option>
            </select>
            {errors.type && <span className="error-message">{errors.type}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="user">Usuario (Operador) *</label>
            <input
              type="text"
              id="user"
              name="user"
              value={formData.user}
              onChange={handleChange}
              className={errors.user ? 'error' : ''}
              placeholder="Usuario que reporta"
            />
            {errors.user && <span className="error-message">{errors.user}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="created_by">Creado por (Agente)</label>
            <input
              type="text"
              id="created_by"
              name="created_by"
              value={formData.created_by}
              onChange={handleChange}
              placeholder="Agente que crea el ticket"
              readOnly
              className="readonly-field"
            />
          </div>
        </div>

        <div className="form-group full-width">
          <label htmlFor="title">Título</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Título del ticket (opcional)"
          />
        </div>

        <div className="form-group full-width">
          <label htmlFor="description">Descripción</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Descripción del problema o solicitud (opcional)"
            rows={4}
          />
        </div>

        {errors.submit && (
          <div className="error-message submit-error">{errors.submit}</div>
        )}

        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="btn-cancel"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                {ticket ? 'Actualizando...' : 'Creando...'}
              </>
            ) : (
              ticket ? 'Actualizar Ticket' : 'Crear Ticket'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TicketForm;
