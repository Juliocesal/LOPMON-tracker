// src/components/Filters.tsx
import React from 'react';

interface FilterState {
  noRecibo: string;
  fecha: string;
  usuario: string;
  material: string;
  stockId: string;
  estado: string;
}

interface FiltersProps {
  filters: FilterState;
  onFilterChange: (name: keyof FilterState, value: string) => void;
}

const Filters: React.FC<FiltersProps> = ({ filters, onFilterChange }) => {
  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return '';
    // Convert from DD/MM/YYYY to YYYY-MM-DD
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputDate = e.target.value; // YYYY-MM-DD
    if (!inputDate) {
      onFilterChange('fecha', '');
      return;
    }
    // Convert from YYYY-MM-DD to DD/MM/YYYY
    const [year, month, day] = inputDate.split('-');
    const formattedDate = `${day}/${month}/${year}`;
    onFilterChange('fecha', formattedDate);
  };

  return (
    <div className="filters">
      <h3>Filtros</h3>
      <div className="filter-buttons">
        <input
          type="text"
          placeholder="No. De recibo"
          value={filters.noRecibo}
          onChange={(e) => onFilterChange('noRecibo', e.target.value)}
        />
        <input
          type="date"
          placeholder="Fecha"
          value={formatDateForInput(filters.fecha)}
          onChange={handleDateChange}
        />
        <input
          type="text"
          placeholder="Usuario"
          value={filters.usuario}
          onChange={(e) => onFilterChange('usuario', e.target.value)}
        />
        <input
          type="text"
          placeholder="Material"
          value={filters.material}
          onChange={(e) => onFilterChange('material', e.target.value)}
        />
        <input
          type="text"
          placeholder="Stock ID"
          value={filters.stockId}
          onChange={(e) => onFilterChange('stockId', e.target.value)}
        />
      </div>
      <div className="dropdown">
        <select
          value={filters.estado}
          onChange={(e) => onFilterChange('estado', e.target.value)}
        >
          <option value="">Estado</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Abierto">Abierto</option>
          <option value="Cerrado">Cerrado</option>
        </select>
      </div>
    </div>
  );
};

export default Filters;