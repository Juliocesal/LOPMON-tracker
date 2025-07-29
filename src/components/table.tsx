import React, { useState, useEffect } from 'react';

export interface Material {
  id: string;
  name: string;
  stockId: string;
  qty: number;
  accion: string; // Campo para registrar la acción realizada
}

export interface TableRow {
  noRecibo: string;
  fecha: string;
  usuario: string;
  materiales: Material[];
  Estatus: string;
}

interface TableProps {
  data: TableRow[];
  onUpdate?: (updatedData: TableRow[]) => void; // Callback para notificar cambios
}

const Table: React.FC<TableProps> = ({ data: propData, onUpdate }) => {
  const [tableData, setTableData] = useState(propData);

  // Sincroniza con datos externos
  useEffect(() => {
    setTableData(propData);
  }, [propData]);

  // Maneja cambios en las celdas editables
  const handleEdit = (
    rowIndex: number,
    materialIndex: number,
    column: keyof Material,
    value: string | number
  ) => {
    const newData = [...tableData];
    newData[rowIndex].materiales[materialIndex] = {
      ...newData[rowIndex].materiales[materialIndex],
      [column]: value,
    };
    setTableData(newData);
    onUpdate?.(newData); // Notifica al padre
  };

  // Agregar un nuevo material a una fila
  const addMaterial = (rowIndex: number) => {
    const newData = [...tableData];
    newData[rowIndex].materiales.push({
      id: Date.now().toString(), // Genera un ID único
      name: '', // Valor inicial vacío
      stockId: '', // Valor inicial vacío
      qty: 0, // Valor inicial 0
      accion: '' // Valor inicial vacío para la acción
    });
    setTableData(newData);
    onUpdate?.(newData);
  };

  return (
    <div className="table-container modern">
      <table className="table">
        <thead>
          <tr className="header-row">
            <th>No. De recibo</th>
            <th>Fecha</th>
            <th>Usuario</th>
            <th className="materials-column">Materiales</th>
            <th>Estatus</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((row, rowIndex) => (
            <tr key={rowIndex} className="data-row">
              <td>{row.noRecibo}</td>
              <td>{row.fecha}</td>
              <td>{row.usuario}</td>
              <td className="materials-cell">
                <div className="materials-container">
                  <button onClick={() => addMaterial(rowIndex)} className="add-material-button">
                    <span className="button-icon">+</span>
                    <span className="button-text">Agregar Material</span>
                  </button>
                  <div className="materials-list">
                    {row.materiales.map((material, materialIndex) => (
                      <div key={material.id} className="material-grid">
                        <div className="material-field">
                          <label>Nombre:</label>
                          <input
                            type="text"
                            value={material.name}
                            onChange={(e) =>
                              handleEdit(rowIndex, materialIndex, 'name', e.target.value)
                            }
                            className="edit-input"
                          />
                        </div>
                        <div className="material-field">
                          <label>StockID:</label>
                          <input
                            type="text"
                            value={material.stockId}
                            onChange={(e) =>
                              handleEdit(rowIndex, materialIndex, 'stockId', e.target.value)
                            }
                            className="edit-input"
                          />
                        </div>
                        <div className="material-field">
                          <label>Cantidad:</label>
                          <input
                            type="number"
                            value={material.qty}
                            onChange={(e) =>
                              handleEdit(rowIndex, materialIndex, 'qty', Number(e.target.value))
                            }
                            className="edit-input"
                          />
                        </div>
                        <div className="material-field">
                          <label>Acción:</label>
                          <input
                            type="text"
                            value={material.accion}
                            onChange={(e) =>
                              handleEdit(rowIndex, materialIndex, 'accion', e.target.value)
                            }
                            className="edit-input"
                            placeholder="Ej: Usado, Devuelto, En espera"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </td>
              <td>
                <span className={`status-badge ${row.Estatus.toLowerCase()}`}>
                  {row.Estatus}
                </span>
              </td>
              <td className="actions-cell">
                <button className="action-button view">
                  <span className="button-content">Ver</span>
                </button>
                <button className="action-button edit">
                  <span className="button-content">Editar</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;