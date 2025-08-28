import { useEffect, useState } from "react";
import { supabase } from '../utils/supabaseClient';

const TableRow = ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>;

const OpenPos = () => {
  const [poRecibos, setPoRecibos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editRowId, setEditRowId] = useState<number | null>(null);
  const [editRowData, setEditRowData] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
  }, [editLoading]);

  const handleEditClick = (row: any) => {
    setEditRowId(row.ticket_id);
    setEditRowData({
      numero_recibo: row.numero_recibo,
      usuario: row.usuario,
      material_faltante: row.material_faltante || '',
      status: row.status
    });
  };

  const handleSaveEdit = async (rowId: number) => {
    setEditLoading(true);
    const { error } = await supabase
      .from('po_recibos_incompletos')
      .update({
        numero_recibo: editRowData.numero_recibo,
        usuario: editRowData.usuario,
        material_faltante: editRowData.material_faltante,
        status: editRowData.status
      })
      .eq('ticket_id', rowId);

    if (!error) {
      setEditRowId(null);
      setEditRowData({});
      setMessage('Modificación guardada.');
    } else {
      setMessage('Error al guardar: ' + error.message);
    }
    setEditLoading(false);
  };

  const handleCancelEdit = () => {
    setEditRowId(null);
    setEditRowData({});
  };

  return (
    <div style={{ padding: 32 }}>
      <h2 style={{ fontWeight: 700, fontSize: 24, marginBottom: 24 }}>Editar POs Incompletos</h2>
      {message && (
        <div style={{ marginBottom: 16, color: "#2563eb" }}>{message}</div>
      )}
      {isLoading ? (
        <div style={{ padding: 40, textAlign: "center" }}>Cargando datos...</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8 }}>
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>No. De recibo</th>
              <th>Usuario</th>
              <th>Material faltante</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {poRecibos.length > 0 ? (
              poRecibos.map((po) => (
                <TableRow key={po.ticket_id}>
                  <td>{po.ticket_id}</td>
                  <td>
                    {editRowId === po.ticket_id ? (
                      <input
                        type="text"
                        value={editRowData.numero_recibo}
                        onChange={e => setEditRowData((d: any) => ({ ...d, numero_recibo: e.target.value }))}
                        disabled={editLoading}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      po.numero_recibo
                    )}
                  </td>
                  <td>
                    {editRowId === po.ticket_id ? (
                      <input
                        type="text"
                        value={editRowData.usuario}
                        onChange={e => setEditRowData((d: any) => ({ ...d, usuario: e.target.value }))}
                        disabled={editLoading}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      po.usuario
                    )}
                  </td>
                  <td>
                    {editRowId === po.ticket_id ? (
                      <input
                        type="text"
                        value={editRowData.material_faltante}
                        onChange={e => setEditRowData((d: any) => ({ ...d, material_faltante: e.target.value }))}
                        disabled={editLoading}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      po.material_faltante || ''
                    )}
                  </td>
                  <td>
                    {editRowId === po.ticket_id ? (
                      <input
                        type="text"
                        value={editRowData.status}
                        onChange={e => setEditRowData((d: any) => ({ ...d, status: e.target.value }))}
                        disabled={editLoading}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      po.status
                    )}
                  </td>
                  <td>
                    {editRowId === po.ticket_id ? (
                      <>
                        <button
                          style={{ padding: '6px 12px', fontSize: 12, marginRight: 4 }}
                          onClick={() => handleSaveEdit(po.ticket_id)}
                          disabled={editLoading}
                        >
                          Guardar
                        </button>
                        <button
                          style={{ padding: '6px 12px', fontSize: 12, background: '#64748b', color: '#fff' }}
                          onClick={handleCancelEdit}
                          disabled={editLoading}
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        style={{ padding: '6px 12px', fontSize: 12 }}
                        onClick={() => handleEditClick(po)}
                      >
                        Editar
                      </button>
                    )}
                  </td>
                </TableRow>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#64748b" }}>
                  No se encontraron órdenes de compra ingresadas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default OpenPos;
