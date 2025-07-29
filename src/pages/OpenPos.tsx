import React, { useState, useMemo, useEffect } from 'react';
import '../styles/OpenPos.css'; // Importa el CSS específico para esta página
import Breadcrumb from '../components/Breadcrumb';
import Header from '../components/header2';
import Filters from '../components/Filters';
import Stats from '../components/Stats';
import Table from '../components/table';
import Loading from '../components/Loading';
import type { TableRow } from '../components/table';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    noRecibo: '',
    fecha: '',
    usuario: '',
    material: '',
    stockId: '',
    estado: ''
  });

  const [tableData, setTableData] = useState<TableRow[]>([
    {
      noRecibo: "7204859",
      fecha: "15/08/2023",
      usuario: "Martinez4k7",
      materiales: [
        { id: "1", name: "AOO0132", stockId: "00200412494", qty: 5, accion: "" },
        { id: "2", name: "Material B", stockId: "72048595678", qty: 3, accion: "" }
      ],
      Estatus: "Abierto"
    },
    {
      noRecibo: "3819462",
      fecha: "22/11/2024",
      usuario: "Rodriguezp8d",
      materiales: [
        { id: "3", name: "Material C", stockId: "38194625678", qty: 2, accion: "Hola" }
      ],
      Estatus: "Abierto"
    },
    {
      noRecibo: "5930174",
      fecha: "05/03/2025",
      usuario: "Garciaq2x",
      materiales: [
        { id: "4", name: "Material D", stockId: "59301749012", qty: 7, accion: "" },
        { id: "5", name: "Material E", stockId: "59301741234", qty: 4, accion: "" }
      ],
      Estatus: "Pendiente"
    }
  ]);

  useEffect(() => {
    // Simulate loading time for data fetching
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const filteredData = useMemo(() => {
    return tableData.filter(row => {
      const dateMatch = !filters.fecha || row.fecha === filters.fecha;

      const materialMatch =
        !filters.material ||
        row.materiales.some(material =>
          material.name.toLowerCase().includes(filters.material.toLowerCase())
        );

      return (
        (!filters.noRecibo ||
          row.noRecibo.toLowerCase().includes(filters.noRecibo.toLowerCase())) &&
        dateMatch &&
        (!filters.usuario ||
          row.usuario.toLowerCase().includes(filters.usuario.toLowerCase())) &&
        materialMatch &&
        (!filters.stockId ||
          row.materiales.some(material =>
            material.stockId.toLowerCase().includes(filters.stockId.toLowerCase())
          )) &&
        (!filters.estado || row.Estatus === filters.estado)
      );
    });
  }, [tableData, filters]);

  const stats = filteredData.reduce(
    (acc, row) => {
      switch (row.Estatus.toLowerCase()) {
        case 'pendiente':
          acc.pending++;
          break;
        case 'abierto':
          acc.open++;
          break;
        case 'cerrado':
          acc.closed++;
          break;
      }
      return acc;
    },
    { pending: 0, open: 0, closed: 0 }
  );

  const handleTableUpdate = (updatedData: TableRow[]) => {
    setTableData(updatedData);
  };

  if (loading) {
    return <Loading message="Cargando POs abiertos..." />;
  }

  return (
    <div className="container">
      {/* Breadcrumb */}
      <Breadcrumb path="Receiving > Open POs" />

      {/* Header */}
      <Header title="OPEN POs" />

      {/* Filtros y Estadísticas */}
      <div className="filters-stats-container">
        <Filters filters={filters} onFilterChange={handleFilterChange} />
        <Stats pending={stats.pending} open={stats.open} closed={stats.closed} />
      </div>

      {/* Tabla */}
      <Table data={filteredData} onUpdate={handleTableUpdate} />
    </div>
  );
};

export default App;