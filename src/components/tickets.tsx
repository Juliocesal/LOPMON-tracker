// src/components/tickets.tsx
import React, { useState, useEffect } from 'react';
import { Ticket, TicketFilter, TicketStats } from '../hooks/types';
import { 
  getTickets, 
  getTicketStats, 
  deleteTicket, 
  changeTicketStatus 
} from '../api/ChatApi';
import TicketForm from './TicketForm';
import Loading from './Loading';
import './TicketManagement.css';

const TicketManagement: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [initialLoading, setInitialLoading] = useState(true); // Loading inicial
  const [tableLoading, setTableLoading] = useState(false); // Loading solo para la tabla
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [filters, setFilters] = useState<TicketFilter>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [hasInitialLoad, setHasInitialLoad] = useState(false); // Para controlar la primera carga
  const [allTickets, setAllTickets] = useState<Ticket[]>([]); // Mantener todos los tickets para filtrado local
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Efecto para actualizar prioridad a 'high' si lleva más de 24h abierta
  useEffect(() => {
    if (!hasInitialLoad) {
      // Primera carga - loading completo
      loadTicketsInitial();
      loadStats();
    } else {
      // Cargas subsecuentes - solo loading de tabla
      loadTicketsFiltered();
    }
  }, [filters]);

  // Efecto para actualizar prioridad de tickets abiertos con más de 24h
  useEffect(() => {
    const now = new Date();
    const updateAgedTickets = async () => {
      const agedTickets = allTickets.filter(ticket => {
        if ((ticket.status === 'open' || ticket.status === 'in_progress') && ticket.priority !== 'high' && ticket.priority !== 'urgent' && ticket.created_at) {
          const created = new Date(ticket.created_at);
          const hours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
          return hours > 24;
        }
        return false;
      });
      for (const ticket of agedTickets) {
        try {
          // Actualiza en backend
          await import('../api/ChatApi').then(api => api.updateTicket(ticket.id, { priority: 'high' }));
        } catch (e) {
          // Silenciar error para no romper UI
          console.error('Error actualizando prioridad a high:', e);
        }
      }
      if (agedTickets.length > 0) {
        // Recarga tickets y stats si hubo cambios
        loadTickets();
        loadStats();
      }
    };
    if (allTickets.length > 0) {
      updateAgedTickets();
    }
    // Solo ejecuta cuando cambian los tickets
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTickets]);

  // Efecto para búsqueda en tiempo real con debounce
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      if (hasInitialLoad && allTickets.length > 0) {
        applyFiltersAndSearch();
      }
    }, 300); // 300ms de delay
    
    setSearchTimeout(timeout);
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchTerm, hasInitialLoad, allTickets]);

  const loadTicketsInitial = async () => {
    try {
      setInitialLoading(true);
      const data = await getTickets({});
      setAllTickets(data);
      setTickets(data);
      setHasInitialLoad(true);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const loadTicketsFiltered = async () => {
    try {
      setTableLoading(true);
      const data = await getTickets({});
      setAllTickets(data);
      applyFiltersAndSearch(data);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setTableLoading(false);
    }
  };

  const loadTickets = async () => {
    // Función de recarga general (para acciones como crear, editar, eliminar)
    try {
      setTableLoading(true);
      const data = await getTickets({});
      setAllTickets(data);
      applyFiltersAndSearch(data);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setTableLoading(false);
    }
  };

  // Función para aplicar filtros y búsqueda localmente
  const applyFiltersAndSearch = (ticketsData?: Ticket[]) => {
    const dataToFilter = ticketsData || allTickets;
    let filteredTickets = [...dataToFilter];

    // Aplicar búsqueda por texto
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filteredTickets = filteredTickets.filter(ticket => {
        // Búsqueda en múltiples campos
        const searchFields = [
          ticket.id,
          ticket.id_incremental?.toString(),
          ticket.title,
          ticket.description,
          ticket.location,
          ticket.tote_number,
          ticket.stock_id,
          ticket.chat_id,
          ticket.user,
          ticket.created_by,
          ticket.customer_name,
          ticket.customer_email,
          ticket.type,
          ticket.category,
          ticket.resolution
        ];

        return searchFields.some(field => 
          field && field.toString().toLowerCase().includes(searchLower)
        );
      });
    }

    // Aplicar filtros específicos
    if (filters.status) {
      filteredTickets = filteredTickets.filter(ticket => ticket.status === filters.status);
    }

    if (filters.priority) {
      filteredTickets = filteredTickets.filter(ticket => ticket.priority === filters.priority);
    }

    if (filters.type) {
      filteredTickets = filteredTickets.filter(ticket => ticket.type === filters.type);
    }

    if (filters.location && filters.location.trim()) {
      const locationLower = filters.location.toLowerCase().trim();
      filteredTickets = filteredTickets.filter(ticket => 
        ticket.location && ticket.location.toLowerCase().includes(locationLower)
      );
    }

    if (filters.user && filters.user.trim()) {
      const userLower = filters.user.toLowerCase().trim();
      filteredTickets = filteredTickets.filter(ticket => 
        (ticket.user && ticket.user.toLowerCase().includes(userLower)) ||
        (ticket.created_by && ticket.created_by.toLowerCase().includes(userLower)) ||
        (ticket.customer_name && ticket.customer_name.toLowerCase().includes(userLower))
      );
    }

    setTickets(filteredTickets);
  };

  const loadStats = async () => {
    try {
      const data = await getTicketStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSearch = () => {
    applyFiltersAndSearch();
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setTickets(allTickets);
  };

  const handleFilterChange = (key: keyof TicketFilter, value: string | undefined) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
    
    // Si hay filtros aplicados, aplicar inmediatamente
    if (hasInitialLoad) {
      // Pequeño delay para mejor UX
      setTimeout(() => {
        applyFiltersAndSearch();
      }, 100);
    }
  };

  // Función helper para verificar si hay filtros activos realmente
  const hasActiveFilters = () => {
    const hasSearchTerm = searchTerm.trim().length > 0;
    const hasFilters = Object.values(filters).some(value => 
      value !== undefined && value !== null && value.toString().trim().length > 0
    );
    return hasSearchTerm || hasFilters;
  };

  const handleStatusChange = async (ticketId: string, newStatus: Ticket['status']) => {
    try {
      await changeTicketStatus(ticketId, newStatus);
      loadTickets();
      loadStats();
    } catch (error) {
      console.error('Error updating ticket status:', error);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este ticket?')) {
      try {
        await deleteTicket(ticketId);
        loadTickets();
        loadStats();
      } catch (error) {
        console.error('Error deleting ticket:', error);
      }
    }
  };

  const openTicketModal = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowModal(true);
  };

  const handleNewTicket = () => {
    setEditingTicket(null);
    setShowForm(true);
  };

  const handleEditTicket = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingTicket(null);
    loadTickets();
    loadStats();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingTicket(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#3742fa';
      case 'in_progress': return '#ffa502';
      case 'resolved': return '#2ed573';
      case 'closed': return '#747d8c';
      default: return '#70a1ff';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Abierto';
      case 'in_progress': return 'En Progreso';
      case 'resolved': return 'Resuelto';
      case 'closed': return 'Cerrado';
      default: return status;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return '#ff4757';
      case 'high': return '#ffa502';
      case 'medium': return '#3742fa';
      case 'low': return '#2ed573';
      default: return '#70a1ff';
    }
  };

  const getPriorityIcon = (priority?: string) => {
    switch (priority) {
      case 'urgent': return '🔥';
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '●';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = (dueDateString?: string) => {
    if (!dueDateString) return false;
    return new Date(dueDateString) < new Date();
  };

  // Solo mostrar loading completo en la carga inicial
  if (initialLoading) {
    return <Loading message="Cargando tickets..." />;
  }

  return (
    <div className="tickets-container">
      {/* Header */}
      <div className="tickets-header">
        <h1>Gestión de Tickets</h1>
        <button className="btn-primary" onClick={handleNewTicket}>
          + Nuevo Ticket
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card total">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>{stats.total}</h3>
              <p>Total de Tickets</p>
            </div>
          </div>
          <div className="stat-card open">
            <div className="stat-icon">🔓</div>
            <div className="stat-content">
              <h3>{stats.open}</h3>
              <p>Abiertos</p>
            </div>
          </div>
          <div className="stat-card progress">
            <div className="stat-icon">⚡</div>
            <div className="stat-content">
              <h3>{stats.in_progress}</h3>
              <p>En Progreso</p>
            </div>
          </div>
          <div className="stat-card resolved">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>{stats.resolved}</h3>
              <p>Resueltos</p>
            </div>
          </div>
          <div className="stat-card priority">
            <div className="stat-icon">🔥</div>
            <div className="stat-content">
              <h3>{stats.high_priority}</h3>
              <p>Alta Prioridad</p>
            </div>
          </div>
          <div className="stat-card overdue">
            <div className="stat-icon">⏰</div>
            <div className="stat-content">
              <h3>{stats.overdue}</h3>
              <p>Vencidos</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-main-row">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Buscar en todos los campos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} className="search-btn">
              ⌕
            </button>
          </div>

          <div className="filter-controls">
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="open">Abierto</option>
              <option value="in_progress">En Progreso</option>
              <option value="resolved">Resuelto</option>
              <option value="closed">Cerrado</option>
            </select>

            <select
              value={filters.priority || ''}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
            >
              <option value="">Todas las prioridades</option>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>

            <select
              value={filters.type || ''}
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="">Todos los tipos</option>
              <option value="exception">Excepción</option>
              <option value="inventory">Inventario</option>
              <option value="technical">Técnico</option>
              <option value="general">General</option>
            </select>

            <input
              type="text"
              placeholder="Filtrar por ubicación..."
              value={filters.location || ''}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              className="filter-input"
            />

            <input
              type="text"
              placeholder="Filtrar por usuario/creador..."
              value={filters.user || ''}
              onChange={(e) => handleFilterChange('user', e.target.value)}
              className="filter-input"
            />

            <button 
              onClick={handleClearFilters}
              className="clear-filters-btn"
              title="Limpiar todos los filtros"
            >
              × Limpiar
            </button>
          </div>
        </div>
        
        {/* Indicadores de filtros activos */}
        {hasActiveFilters() && (
          <div className="active-filters has-filters">
            <span className="active-filters-label">Filtros activos:</span>
            {searchTerm.trim() && (
              <span className="filter-tag">
                Búsqueda: "{searchTerm}"
                <button onClick={() => setSearchTerm('')}>×</button>
              </span>
            )}
            {filters.status && filters.status.trim() && (
              <span className="filter-tag">
                Estado: {getStatusLabel(filters.status)}
                <button onClick={() => handleFilterChange('status', undefined)}>×</button>
              </span>
            )}
            {filters.priority && filters.priority.trim() && (
              <span className="filter-tag">
                Prioridad: {filters.priority}
                <button onClick={() => handleFilterChange('priority', undefined)}>×</button>
              </span>
            )}
            {filters.type && filters.type.trim() && (
              <span className="filter-tag">
                Tipo: {filters.type}
                <button onClick={() => handleFilterChange('type', undefined)}>×</button>
              </span>
            )}
            {filters.location && filters.location.trim() && (
              <span className="filter-tag">
                Ubicación: {filters.location}
                <button onClick={() => handleFilterChange('location', undefined)}>×</button>
              </span>
            )}
            {filters.user && filters.user.trim() && (
              <span className="filter-tag">
                Usuario: {filters.user}
                <button onClick={() => handleFilterChange('user', undefined)}>×</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tickets Table */}
      <div className="tickets-table-container">
        <div className="table-header-info">
          <span className="tickets-count">
            Mostrando {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="tickets-table-wrapper">
          <table className="tickets-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Estado</th>
                <th>Creado</th>
                <th>Ubicación</th>
                <th>Número Tote</th>
                <th>Stock ID</th>
                <th>Chat ID</th>
                <th>Tipo</th>
                <th>Usuario</th>
                <th>Creado por</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tableLoading ? (
                <tr>
                  <td colSpan={11} className="table-loading-cell">
                    <div className="table-loading-overlay">
                      <div className="table-loading-content">
                        <div className="table-spinner"></div>
                        <span>Cargando tickets...</span>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={11} className="table-empty-cell">
                    <div className="table-empty-overlay">
                      <div className="table-empty-content">
                        <div className="empty-icon">
                          {(Object.keys(filters).length > 0 || searchTerm.trim()) ? '🔍' : '📋'}
                        </div>
                        <h3>
                          {(Object.keys(filters).length > 0 || searchTerm.trim()) 
                            ? 'No se encontraron tickets' 
                            : 'No hay tickets disponibles'
                          }
                        </h3>
                        <p>
                          {(Object.keys(filters).length > 0 || searchTerm.trim()) 
                            ? 'No hay tickets que coincidan con los criterios de búsqueda y filtros aplicados.' 
                            : 'Aún no se han creado tickets en el sistema.'
                          }
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                <tr key={ticket.id} className="ticket-row">
                  <td className="ticket-id">
                    <div className="ticket-id-container">
                      {ticket.id_incremental ? `#${ticket.id_incremental}` : `#${ticket.id.slice(-8)}`}
                      {ticket.priority && (
                        <span 
                          className="priority-indicator"
                          style={{ color: getPriorityColor(ticket.priority) }}
                          title={`Prioridad: ${ticket.priority}`}
                        >
                          {getPriorityIcon(ticket.priority)}
                        </span>
                      )}
                      {isOverdue(ticket.due_date) && (
                        <span className="overdue-indicator" title="Vencido">!</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <select
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(ticket.id, e.target.value as Ticket['status'])}
                      className="status-select"
                      style={{ backgroundColor: getStatusColor(ticket.status) }}
                    >
                      <option value="open">Abierto</option>
                      <option value="in_progress">En Progreso</option>
                      <option value="resolved">Resuelto</option>
                      <option value="closed">Cerrado</option>
                    </select>
                  </td>
                  <td className="date-cell">{formatDate(ticket.created_at)}</td>
                  <td className="location-cell">{ticket.location || 'N/A'}</td>
                  <td className="tote-number-cell">{ticket.tote_number || 'N/A'}</td>
                  <td className="stock-id-cell">{ticket.stock_id || 'N/A'}</td>
                  <td className="chat-id-cell">
                    {ticket.chat_id ? `#${ticket.chat_id.slice(-8)}` : 'N/A'}
                  </td>
                  <td className="type-cell">
                    <span className="type-badge">{ticket.type || 'General'}</span>
                  </td>
                  <td className="user-cell">{ticket.user || 'N/A'}</td>
                  <td className="created-by-cell">{ticket.created_by || 'N/A'}</td>
                  <td className="actions-cell">
                    <div className="action-buttons">
                      <button 
                        onClick={() => openTicketModal(ticket)}
                        className="action-btn action-btn-view"
                        title="Ver detalles del ticket"
                      >
                        <span className="action-icon">●</span>
                        <span className="action-text">Ver</span>
                      </button>
                      <button 
                        onClick={() => handleEditTicket(ticket)}
                        className="action-btn action-btn-edit"
                        title="Editar ticket"
                      >
                        <span className="action-icon">✎</span>
                        <span className="action-text">Editar</span>
                      </button>
                      <button 
                        onClick={() => handleDeleteTicket(ticket.id)}
                        className="action-btn action-btn-delete"
                        title="Eliminar ticket"
                      >
                        <span className="action-icon">✕</span>
                        <span className="action-text">Eliminar</span>
                      </button>
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Detail Modal */}
      {showModal && selectedTicket && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content ticket-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="header-content">
                <div className="header-main">
                  <h2>Ticket {selectedTicket.id_incremental ? `#${selectedTicket.id_incremental}` : `#${selectedTicket.id.slice(-8)}`}</h2>
                  <div className="header-badges">
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(selectedTicket.status) }}
                    >
                      {getStatusLabel(selectedTicket.status)}
                    </span>
                    {selectedTicket.priority && (
                      <span 
                        className="priority-badge"
                        style={{ backgroundColor: getPriorityColor(selectedTicket.priority) }}
                      >
                        {getPriorityIcon(selectedTicket.priority)} {selectedTicket.priority?.toUpperCase()}
                      </span>
                    )}
                    {isOverdue(selectedTicket.due_date) && (
                      <span className="overdue-badge">
                        ⏰ VENCIDO
                      </span>
                    )}
                  </div>
                </div>
                {selectedTicket.title && (
                  <div className="header-title">
                    <h3>{selectedTicket.title}</h3>
                  </div>
                )}
              </div>
              <button onClick={() => setShowModal(false)} className="close-btn">✕</button>
            </div>
            
            <div className="modal-body">
              <div className="ticket-detail-grid">
                {/* Información General */}
                <div className="detail-section">
                  <h3>📋 Información General</h3>
                  <div className="detail-item">
                    <label>ID Completo:</label>
                    <span>{selectedTicket.id}</span>
                  </div>
                  <div className="detail-item">
                    <label>Tipo:</label>
                    <span>{selectedTicket.type || 'General'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Categoría:</label>
                    <span>{selectedTicket.category || 'No especificado'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Creado:</label>
                    <span>{formatDate(selectedTicket.created_at)}</span>
                  </div>
                  {selectedTicket.updated_at && (
                    <div className="detail-item">
                      <label>Última actualización:</label>
                      <span>{formatDate(selectedTicket.updated_at)}</span>
                    </div>
                  )}
                  {selectedTicket.due_date && (
                    <div className="detail-item">
                      <label>Fecha límite:</label>
                      <span className={isOverdue(selectedTicket.due_date) ? 'overdue' : ''}>
                        {formatDate(selectedTicket.due_date)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Ubicación y Stock */}
                <div className="detail-section">
                  <h3>📦 Ubicación y Stock</h3>
                  <div className="detail-item">
                    <label>Ubicación:</label>
                    <span>{selectedTicket.location || 'No especificado'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Número de Tote:</label>
                    <span>{selectedTicket.tote_number || 'No especificado'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Stock ID:</label>
                    <span>{selectedTicket.stock_id || 'No especificado'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Chat ID:</label>
                    <span>
                      {selectedTicket.chat_id ? `#${selectedTicket.chat_id.slice(-8)}` : 'No especificado'}
                    </span>
                  </div>
                </div>

                {/* Gestión y Asignación */}
                <div className="detail-section">
                  <h3>👥 Gestión y Asignación</h3>
                  <div className="detail-item">
                    <label>Usuario (Operador):</label>
                    <span>{selectedTicket.user || 'No especificado'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Creado por (Agente):</label>
                    <span>{selectedTicket.created_by || 'No especificado'}</span>
                  </div>
                  {selectedTicket.assigned_to && (
                    <div className="detail-item">
                      <label>Asignado a:</label>
                      <span>{selectedTicket.assigned_to}</span>
                    </div>
                  )}
                  {(selectedTicket.customer_name || selectedTicket.customer_email) && (
                    <>
                      {selectedTicket.customer_name && (
                        <div className="detail-item">
                          <label>Cliente:</label>
                          <span>{selectedTicket.customer_name}</span>
                        </div>
                      )}
                      {selectedTicket.customer_email && (
                        <div className="detail-item">
                          <label>Email Cliente:</label>
                          <span>{selectedTicket.customer_email}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              {/* Descripción */}
              {selectedTicket.description && (
                <div className="detail-section">
                  <h3>📝 Descripción</h3>
                  <p>{selectedTicket.description}</p>
                </div>
              )}
              
              {/* Resolución */}
              {selectedTicket.resolution && (
                <div className="detail-section resolution">
                  <h3>🔧 Resolución</h3>
                  <p>{selectedTicket.resolution}</p>
                </div>
              )}

              {/* Actions */}
              <div className="modal-actions">
                <button 
                  onClick={() => setShowModal(false)}
                  className="btn-action-modal cancel"
                >
                  ✖ Cerrar
                </button>
                <button 
                  onClick={() => {
                    setShowModal(false);
                    handleEditTicket(selectedTicket);
                  }}
                  className="btn-action-modal edit"
                >
                  ✏ Editar Ticket
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm('¿Estás seguro de que quieres eliminar este ticket?')) {
                      handleDeleteTicket(selectedTicket.id);
                      setShowModal(false);
                    }
                  }}
                  className="btn-action-modal delete"
                >
                  🗑 Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={handleFormCancel}>
          <div className="modal-content-form" onClick={(e) => e.stopPropagation()}>
            <TicketForm 
              ticket={editingTicket}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketManagement;
