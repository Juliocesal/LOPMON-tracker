// src/pages/Overs.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import Loading from '../components/Loading';
import { useNotifications } from '../contexts/NotificationContext';
import { Toaster, toast } from 'react-hot-toast';
import '../components/overs.css';

interface Over {
  id: number;
  fecha: string;
  material: string;
  grid_value: string;
  qty: number;
  unit: string;
  stock_category: string;
  no_po: string;
  usuario_id: string;
  usuario_nombre?: string;
}

interface ColumnFilter {
  fecha: string;
  material: string;
  grid_value: string;
  qty: string;
  unit: string;
  stock_category: string;
  no_po: string;
  usuario_nombre: string;
}

const Overs = () => {
  const [overs, setOvers] = useState<Over[]>([]);
  const [filteredOvers, setFilteredOvers] = useState<Over[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [newLine, setNewLine] = useState('');
  const [agentName, setAgentName] = useState<string>('');
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFilter>({
    fecha: '',
    material: '',
    grid_value: '',
    qty: '',
    unit: '',
    stock_category: '',
    no_po: '',
    usuario_nombre: ''
  });
  const [sortConfig, setSortConfig] = useState<{ key: keyof Over; direction: 'asc' | 'desc' } | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const { notifySuccess, notifyError } = useNotifications();

  // Obtener el nombre del usuario autenticado
  useEffect(() => {
    const fetchAgentProfile = async () => {
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (error) console.error('Error al cargar el perfil del agente:', error);
      else setAgentName(data?.full_name || 'Agente Desconocido');
    };

    fetchAgentProfile();
  }, []);

  // Cargar Overs
  const fetchOvers = async () => {
    try {
      setLoading(true);
      const { data: oversData, error: oversError } = await supabase
        .from('overs')
        .select('*')
        .order('fecha', { ascending: false });

      if (oversError) throw oversError;

      const userIds = oversData?.map((o) => o.usuario_id) || [];
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', userIds);

      const oversWithNames = oversData?.map((o: Over) => ({
        ...o,
        usuario_nombre: usersData?.find((u) => u.id === o.usuario_id)?.full_name || o.usuario_id
      })) || [];

      setOvers(oversWithNames);
      setFilteredOvers(oversWithNames);
    } catch (err) {
      console.error(err);
      notifyError('Error cargando Overs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOvers();
  }, []);

  // Funciones de ordenamiento
  const handleSort = (key: keyof Over) => {
    setSortConfig({
      key,
      direction: sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  // Funciones de selección
  const toggleRowSelection = (id: number) => {
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const selectAllRows = () => {
    setSelectedRows(
      selectedRows.length === currentOvers.length ? [] : currentOvers.map(o => o.id)
    );
  };

  // Funciones de filtrado
  const handleColumnFilter = (column: keyof ColumnFilter, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  const clearAllFilters = () => {
    setColumnFilters({
      fecha: '',
      material: '',
      grid_value: '',
      qty: '',
      unit: '',
      stock_category: '',
      no_po: '',
      usuario_nombre: ''
    });
    setSearchTerm('');
    setSortConfig(null);
  };

  // Aplicar todos los filtros
  useEffect(() => {
    let result = overs;

    // Filtro de búsqueda global
    if (searchTerm) {
      result = result.filter(
        (o) =>
          o.material.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.grid_value.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.stock_category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.no_po.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (o.usuario_nombre?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtros por columna
    result = result.filter((o) => {
      return Object.entries(columnFilters).every(([key, value]) => {
        if (!value) return true;
        const rowValue = o[key as keyof Over]?.toString().toLowerCase() || '';
        return rowValue.includes(value.toLowerCase());
      });
    });

    // Ordenamiento - TYPE-SAFE VERSION
    if (sortConfig) {
      result = [...result].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        // Handle undefined/null values
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
        if (bValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
        
        // For numbers, compare numerically
        if (sortConfig.key === 'qty') {
          const numA = aValue as number;
          const numB = bValue as number;
          if (numA < numB) return sortConfig.direction === 'asc' ? -1 : 1;
          if (numA > numB) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }
        
        // For strings, compare alphabetically
        const strA = aValue.toString().toLowerCase();
        const strB = bValue.toString().toLowerCase();
        if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredOvers(result);
    setCurrentPage(1);
  }, [searchTerm, columnFilters, sortConfig, overs]);

  // Paginación
  const totalPages = Math.ceil(filteredOvers.length / itemsPerPage);
  const currentOvers = filteredOvers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Guardar nuevo Over
  const handleSave = async () => {
    if (!newLine.trim()) return;

    if (!agentName) {
      notifyError('Aún no se ha cargado tu nombre, intenta de nuevo.');
      return;
    }

    const parts = newLine.trim().split(/\t|\s+/);
    if (parts.length < 6) {
      toast.error('Formato inválido. Debe contener Material GridValue Qty Unit Stockcat. NoPO');
      return;
    }

    const [material, grid_value, qtyStr, unit, stock_category, no_po] = parts;
    const qty = parseFloat(qtyStr);

    try {
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (!user) {
        notifyError('Debes iniciar sesión');
        return;
      }

      const { error } = await supabase.from('overs').insert([
        {
          fecha: new Date().toISOString(),
          material,
          grid_value,
          qty,
          unit,
          stock_category,
          no_po,
          usuario_id: user.id,
        },
      ]);

      if (error) throw error;

      notifySuccess('Over registrado correctamente');
      setNewLine('');
      setModalOpen(false);
      fetchOvers();
    } catch (err) {
      console.error(err);
      notifyError('Error guardando Over');
    }
  };

  // Exportar datos
  const exportToCSV = () => {
    const headers = ['Fecha', 'Material', 'Grid Value', 'Qty', 'Unit', 'Stockcat.', 'No. PO', 'Usuario'];
    const csvContent = [
      headers.join(','),
      ...filteredOvers.map(o => [
        new Date(o.fecha).toLocaleString(),
        `"${o.material}"`,
        `"${o.grid_value}"`,
        o.qty,
        `"${o.unit}"`,
        `"${o.stock_category}"`,
        `"${o.no_po}"`,
        `"${o.usuario_nombre}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `overs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    notifySuccess('Datos exportados exitosamente');
  };

  if (loading) return <Loading message="Cargando Overs..." />;

  return (
    <>
      <Toaster position="top-right" />
      <div className="overs-container">
        {/* Header con controles */}
        <div className="overs-header">
          <div className="overs-controls">
            <div className="button-container">
  <button className="button-primary" onClick={() => setModalOpen(true)}>
    + Nuevo Over
  </button>
  <button className="button-secondary" onClick={exportToCSV}>
    Exportar CSV
  </button>
  <button className="button-outline" onClick={clearAllFilters}>
    Limpiar Filtros
  </button>
</div>

          </div>
          
          {/* Estadísticas */}
          <div className="overs-stats">
            <span>Mostrando {currentOvers.length} de {filteredOvers.length} registros</span>
            {Object.values(columnFilters).some(filter => filter) && (
              <span className="filters-active">Filtros activos</span>
            )}
          </div>
        </div>

        {/* Tabla con filtros SAP-like */}
        <div className="overs-table-container">
          <table className="overs-table">
            <thead>
              {/* Fila de encabezados */}
              <tr>
                <th className="select-column">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === currentOvers.length && currentOvers.length > 0}
                    onChange={selectAllRows}
                  />
                </th>
                <th 
                  className="sortable"
                  onClick={() => handleSort('fecha')}
                >
                  Fecha {sortConfig?.key === 'fecha' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="sortable"
                  onClick={() => handleSort('material')}
                >
                  Material {sortConfig?.key === 'material' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="sortable"
                  onClick={() => handleSort('grid_value')}
                >
                  Grid Value {sortConfig?.key === 'grid_value' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="sortable"
                  onClick={() => handleSort('qty')}
                >
                  Qty {sortConfig?.key === 'qty' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="sortable"
                  onClick={() => handleSort('unit')}
                >
                  Unit {sortConfig?.key === 'unit' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="sortable"
                  onClick={() => handleSort('stock_category')}
                >
                  Stockcat. {sortConfig?.key === 'stock_category' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="sortable"
                  onClick={() => handleSort('no_po')}
                >
                  No. PO {sortConfig?.key === 'no_po' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="sortable"
                  onClick={() => handleSort('usuario_nombre')}
                >
                  Usuario {sortConfig?.key === 'usuario_nombre' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
              
              {/* Fila de filtros */}
              <tr className="filter-row">
                <td></td>
                <td>
                  <input
                    type="text"
                    placeholder="Filtrar fecha..."
                    value={columnFilters.fecha}
                    onChange={(e) => handleColumnFilter('fecha', e.target.value)}
                    className="column-filter"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Filtrar material..."
                    value={columnFilters.material}
                    onChange={(e) => handleColumnFilter('material', e.target.value)}
                    className="column-filter"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Filtrar grid value..."
                    value={columnFilters.grid_value}
                    onChange={(e) => handleColumnFilter('grid_value', e.target.value)}
                    className="column-filter"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Filtrar cantidad..."
                    value={columnFilters.qty}
                    onChange={(e) => handleColumnFilter('qty', e.target.value)}
                    className="column-filter"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Filtrar unidad..."
                    value={columnFilters.unit}
                    onChange={(e) => handleColumnFilter('unit', e.target.value)}
                    className="column-filter"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Filtrar stockcat..."
                    value={columnFilters.stock_category}
                    onChange={(e) => handleColumnFilter('stock_category', e.target.value)}
                    className="column-filter"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Filtrar No. PO..."
                    value={columnFilters.no_po}
                    onChange={(e) => handleColumnFilter('no_po', e.target.value)}
                    className="column-filter"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Filtrar usuario..."
                    value={columnFilters.usuario_nombre}
                    onChange={(e) => handleColumnFilter('usuario_nombre', e.target.value)}
                    className="column-filter"
                  />
                </td>
              </tr>
            </thead>
            <tbody>
              {currentOvers.map((o) => (
                <tr 
                  key={o.id} 
                  className={selectedRows.includes(o.id) ? 'selected' : ''}
                >
                  <td className="select-column">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(o.id)}
                      onChange={() => toggleRowSelection(o.id)}
                    />
                  </td>
                  <td>{new Date(o.fecha).toLocaleString()}</td>
                  <td>{o.material}</td>
                  <td>{o.grid_value}</td>
                  <td>{o.qty}</td>
                  <td>{o.unit}</td>
                  <td>{o.stock_category}</td>
                  <td>{o.no_po}</td>
                  <td>{o.usuario_nombre}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="overs-pagination">
            <div className="pagination-controls">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-button"
              >
                ← Anterior
              </button>
              
              <span className="pagination-info">
                Página {currentPage} de {totalPages}
              </span>
              
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-button"
              >
                Siguiente →
              </button>
            </div>
            
            <div className="pagination-size">
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="page-size-select"
              >
                <option value={20}>20 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
                <option value={200}>200 por página</option>
              </select>
            </div>
          </div>
        )}

        {/* Modal */}
        {modalOpen && (
          <div className="overs-modal-backdrop">
            <div className="overs-modal">
              <h2>Registrar Nuevo Over</h2>
              <p className="text-sm text-gray-600 mb-2">
                Pega la línea completa: <span className="font-mono">Material GridValue Qty Unit Stockcat NoPO</span>
              </p>
              <textarea
                rows={3}
                value={newLine}
                onChange={(e) => setNewLine(e.target.value)}
                placeholder="Ejemplo: 0AX4154SU 83622A56 1 NR BRA999999 480123131"
                className="mb-4"
              />
              <div className="overs-modal-actions">
                <button
                  className="button-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  className="button-primary"
                  onClick={handleSave}
                >
                  Guardar Over
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Overs;