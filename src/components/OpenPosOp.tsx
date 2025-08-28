import React, { useState, useEffect, useCallback } from "react";
import '../styles/OpenPosOp.css';
import { supabase } from '../utils/supabaseClient'; // Asegúrate de tener la instancia

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
    status: '' // Solo para registro, no para filtrar
  });
  const [poRecibos, setPoRecibos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [insertLoading, setInsertLoading] = useState(false);
  const [insertMessage, setInsertMessage] = useState<string | null>(null);

  // Cargar las POs ingresadas desde la tabla po_recibos_incompletos
  useEffect(() => {
    const fetchPOs = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('po_recibos_incompletos')
        .select('*')
        .order('fecha_registro', { ascending: false });
      if (!error) setPoRecibos(data || []);
      setIsLoading(false);
    };
    fetchPOs();
  }, [insertLoading]); // Recarga cuando se ingresa una nueva PO

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

  const handleInsertPO = useCallback(async () => {
    setInsertLoading(true);
    setInsertMessage(null);

    // Validar campo requerido
    if (!filters.receiptNumber) {
      setInsertMessage('Debes ingresar el número de recibo.');
      setInsertLoading(false);
      return;
    }

    // Insertar en la tabla po_recibos_incompletos
    const { error } = await supabase
      .from('po_recibos_incompletos')
      .insert([{
        usuario: filters.user || 'Desconocido',
        numero_recibo: filters.receiptNumber,
        fecha_registro: new Date().toISOString(),
        status: 'Abierto'
      }]);

    if (error) {
      setInsertMessage('Error al ingresar la PO: ' + error.message);
    } else {
      setInsertMessage('PO ingresada correctamente.');
      setFilters({ receiptNumber: '', user: '', status: '' });
    }
    setInsertLoading(false);
  }, [filters]);

  const isFiltersEmpty = !filters.receiptNumber && !filters.user && !filters.status;

  return (
    <div className="open-pos-op">
      <div className="open-pos-op__breadcrumb">
        Receiving {'>'} <b>Open POs</b>
      </div>
      <div className="open-pos-op__header">OPEN POs</div>
      
      <div className="open-pos-op__container">
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
            onChange={(e) => setFilters(prev => ({ ...prev, receiptNumber: e.target.value }))}
            disabled={insertLoading}
          />
          
          <input
            className="open-pos-op__input"
            type="text"
            placeholder="Usuario"
            value={filters.user}
            onChange={(e) => setFilters(prev => ({ ...prev, user: e.target.value }))}
            disabled={insertLoading}
          />
          
          {/* Elimina el select de estado */}
          
          <button
            className="open-pos-op__button"
            onClick={handleInsertPO}
            disabled={insertLoading || !filters.receiptNumber}
            type="button"
            style={{
              cursor: (insertLoading || !filters.receiptNumber) ? 'not-allowed' : 'pointer'
            }}
          >
            {insertLoading ? 'Ingresando...' : 'Ingresar'}
          </button>
          {insertMessage && (
            <div className="open-pos-op__insert-message">
              {insertMessage}
            </div>
          )}
          
          <div className="open-pos-op__results-count">
            {isLoading ? (
              <div className="open-pos-op__loading">
                <div className="open-pos-op__spinner"></div>
              </div>
            ) : (
              `${poRecibos.length} orden(es) encontrada(s)`
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
                  <th>No. De recibo</th>
                  <th>Fecha</th>
                  <th>Usuario</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {poRecibos.length > 0 ? (
                  poRecibos.map((po) => (
                    <TableRow key={po.ticket_id}>
                      <td>{po.numero_recibo}</td>
                      <td>
                        {po.fecha_registro
                          ? new Date(po.fecha_registro).toLocaleDateString('es-ES')
                          : ''}
                      </td>
                      <td>{po.usuario}</td>
                      <td>
                        <span className="open-pos-op__status-badge">{po.status}</span>
                      </td>
                    </TableRow>
                  ))
                ) : (
                  <tr>
                    <td className="open-pos-op__empty-state" colSpan={4}>
                      No se encontraron órdenes de compra ingresadas
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