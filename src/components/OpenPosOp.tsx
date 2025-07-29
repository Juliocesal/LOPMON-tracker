import React, { useState, useMemo, useCallback } from "react";
import '../styles/OpenPosOp.css';

// Constants
const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'Pendiente', label: 'Pendiente' },
  { value: 'En Proceso', label: 'En Proceso' },
  { value: 'Completado', label: 'Completado' }
] as const;

const COLUMN_HEADERS = [
  'No. De recibo',
  'Fecha',
  'Usuario',
  'Material',
  'StockID',
  'Cantidad',
  'Estado'
] as const;

// Types
interface PurchaseOrder {
  id: string;
  receiptNumber: string;
  date: string;
  user: string;
  material: string;
  stockId: string;
  quantity: number;
  status: 'Pendiente' | 'Completado' | 'En Proceso';
}

interface FilterState {
  receiptNumber: string;
  user: string;
  status: string;
}

// Mock data for demonstration
const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: "1",
    receiptNumber: "6803120",
    date: "2025-04-30",
    user: "Lopezhej",
    material: "OOO3242",
    stockId: "00200432949",
    quantity: 3,
    status: "Pendiente"
  },
  {
    id: "2",
    receiptNumber: "6803121",
    date: "2025-05-01",
    user: "Lopezhej",
    material: "OOO3243",
    stockId: "00200432950",
    quantity: 5,
    status: "En Proceso"
  },
  {
    id: "3",
    receiptNumber: "6803122",
    date: "2025-05-02",
    user: "Martinez",
    material: "OOO3244",
    stockId: "00200432951",
    quantity: 2,
    status: "Completado"
  }
];

// Component for table row with hover effect
const TableRow: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <tr>{children}</tr>;
};

// Component for status badge
const StatusBadge: React.FC<{ status: PurchaseOrder['status'] }> = ({ status }) => {
  const getStatusClass = () => {
    switch (status) {
      case 'Pendiente':
        return 'open-pos-op__status-badge open-pos-op__status-badge--pendiente';
      case 'Completado':
        return 'open-pos-op__status-badge open-pos-op__status-badge--completado';
      case 'En Proceso':
        return 'open-pos-op__status-badge open-pos-op__status-badge--en-proceso';
      default:
        return 'open-pos-op__status-badge';
    }
  };

  return <span className={getStatusClass()}>{status}</span>;
};

// Main component
function OpenPosOp() {
  const [filters, setFilters] = useState<FilterState>({
    receiptNumber: '',
    user: '',
    status: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  // Filter logic with loading simulation
  const filteredOrders = useMemo(() => {
    return mockPurchaseOrders.filter(order => {
      const matchesReceipt = !filters.receiptNumber || 
        order.receiptNumber.toLowerCase().includes(filters.receiptNumber.toLowerCase());
      const matchesUser = !filters.user || 
        order.user.toLowerCase().includes(filters.user.toLowerCase());
      const matchesStatus = !filters.status || order.status === filters.status;
      
      return matchesReceipt && matchesUser && matchesStatus;
    });
  }, [filters]);

  const handleInputChange = useCallback((field: keyof FilterState, value: string) => {
    setIsLoading(true);
    setFilters(prev => ({ ...prev, [field]: value }));
    // Simulate loading delay
    setTimeout(() => setIsLoading(false), 300);
  }, []);

  const handleClearFilters = useCallback(() => {
    setIsLoading(true);
    setFilters({ receiptNumber: '', user: '', status: '' });
    setTimeout(() => setIsLoading(false), 300);
  }, []);

  const isFiltersEmpty = !filters.receiptNumber && !filters.user && !filters.status;

  return (
    <div className="open-pos-op">
      <div className="open-pos-op__breadcrumb">
        Receiving {'>'} <b>Open POs</b>
      </div>
      <div className="open-pos-op__header">OPEN POs</div>
      
      <div className="open-pos-op__container">
        {/* Left Panel - Filters */}
        <div className="open-pos-op__left-panel">
          <div className="open-pos-op__welcome-text">
            <span className="open-pos-op__welcome-title">
              ¡Bienvenido!
            </span>
            <span>
              Esta interfaz te ayuda a gestionar y filtrar las órdenes de compra pendientes. 
              Utiliza los filtros para encontrar recibos específicos.
            </span>
          </div>
          
          <input
            className="open-pos-op__input"
            type="text"
            placeholder="Ingresa el No. de recibo"
            value={filters.receiptNumber}
            onChange={(e) => handleInputChange('receiptNumber', e.target.value)}
            disabled={isLoading}
          />
          
          <input
            className="open-pos-op__input"
            type="text"
            placeholder="Usuario"
            value={filters.user}
            onChange={(e) => handleInputChange('user', e.target.value)}
            disabled={isLoading}
          />
          
          <select
            className="open-pos-op__input"
            value={filters.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
            disabled={isLoading}
          >
            {STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <button
            className="open-pos-op__button"
            onClick={handleClearFilters}
            disabled={isFiltersEmpty || isLoading}
          >
            {isLoading ? 'Cargando...' : 'Limpiar Filtros'}
          </button>
          
          <div className="open-pos-op__results-count">
            {isLoading ? (
              <div className="open-pos-op__loading">
                <div className="open-pos-op__spinner"></div>
              </div>
            ) : (
              `${filteredOrders.length} orden(es) encontrada(s)`
            )}
          </div>
        </div>

        {/* Right Panel - Table */}
        <div className="open-pos-op__right-panel">
          {isLoading ? (
            <div className="open-pos-op__loading">
              <div className="open-pos-op__spinner"></div>
              <span style={{ marginLeft: '12px' }}>Cargando datos...</span>
            </div>
          ) : (
            <table className="open-pos-op__table" role="table" aria-label="Tabla de órdenes de compra">
              <thead>
                <tr>
                  {COLUMN_HEADERS.map((header, index) => (
                    <th key={index} scope="col">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <td>{order.receiptNumber}</td>
                      <td>
                        {new Date(order.date).toLocaleDateString('es-ES')}
                      </td>
                      <td>{order.user}</td>
                      <td>{order.material}</td>
                      <td>{order.stockId}</td>
                      <td>{order.quantity}</td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                    </TableRow>
                  ))
                ) : (
                  <tr>
                    <td className="open-pos-op__empty-state" colSpan={COLUMN_HEADERS.length}>
                      No se encontraron órdenes de compra con los filtros aplicados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default OpenPosOp;