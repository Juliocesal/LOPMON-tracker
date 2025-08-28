import { useEffect, useState } from "react";
import { supabase } from '../utils/supabaseClient';

const OpenPos = () => {
  const [recibos, setRecibos] = useState<any[]>([]);
  const [editReciboId, setEditReciboId] = useState<number | null>(null);
  const [editReciboData, setEditReciboData] = useState<any>({});
  const [editMateriales, setEditMateriales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Cargar recibos y materiales
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const { data: recibosData } = await supabase
        .from('po_recibos_incompletos')
        .select('*')
        .order('fecha_registro', { ascending: false });
      setRecibos(recibosData || []);
      setLoading(false);
    };
    fetchAll();
  }, [editReciboId]);

  // Editar recibo y sus materiales
  const handleEditRecibo = async (recibo: any) => {
    setEditReciboId(recibo.ticket_id);
    setEditReciboData({
      usuario: recibo.usuario,
      numero_recibo: recibo.numero_recibo,
      status: recibo.status
    });
    // Cargar materiales desde la base por numero_recibo
    setLoading(true);
    const { data: mats } = await supabase
      .from('material_faltante')
      .select('*')
      .eq('numero_recibo', recibo.numero_recibo);
    setEditMateriales(mats || []);
    setLoading(false);
  };

  // Guardar cambios en recibo
  const handleSaveRecibo = async () => {
    setLoading(true);
    await supabase
      .from('po_recibos_incompletos')
      .update({
        usuario: editReciboData.usuario,
        numero_recibo: editReciboData.numero_recibo,
        status: editReciboData.status
      })
      .eq('ticket_id', editReciboId);
    setMsg('Recibo modificado.');
    setLoading(false);
  };

  // Guardar cambios en materiales existentes
  const handleSaveMateriales = async () => {
    setLoading(true);
    for (const mat of editMateriales.filter(m => m.material_id)) {
      await supabase
        .from('material_faltante')
        .update({
          grid_value: mat.grid_value,
          stock_category: mat.stock_category,
          cantidad: mat.cantidad
        })
        .eq('material_id', mat.material_id);
    }
    setMsg('Materiales modificados.');
    setLoading(false);
  };

  // Guardar nuevos materiales
  const handleSaveNewMateriales = async () => {
    setLoading(true);
    let hasError = false;
    // Usar numero_recibo en vez de ticket_id para la relación
    const numeroRecibo = editReciboData.numero_recibo;
    for (const mat of editMateriales.filter(m => !m.material_id)) {
      const { error } = await supabase
        .from('material_faltante')
        .insert([{
          numero_recibo: numeroRecibo,
          grid_value: mat.grid_value || '',
          stock_category: mat.stock_category || '',
          cantidad: mat.cantidad ?? 0
        }]);
      if (error) hasError = true;
    }
    setMsg(hasError ? 'Error al agregar uno o más materiales.' : 'Nuevos materiales agregados.');
    setEditReciboId(null);
    setEditReciboData({});
    setEditMateriales([]);
    setLoading(false);
  };

  // Añadir nueva línea de material
  const handleAddMaterial = () => {
    setEditMateriales([...editMateriales, { grid_value: '', stock_category: '', cantidad: 0, ticket_id: editReciboId }]);
  };

  // Eliminar material
  const handleDeleteMaterial = async (materialId: number) => {
    setLoading(true);
    await supabase
      .from('material_faltante')
      .delete()
      .eq('material_id', materialId);
    setEditMateriales(editMateriales.filter(m => m.material_id !== materialId));
    setLoading(false);
  };

  // Cerrar edición
  const handleCloseEdit = () => {
    setEditReciboId(null);
    setEditReciboData({});
    setEditMateriales([]);
  };

  return (
    <div style={{ padding: 32 }}>
      <h2 style={{ fontWeight: 700, fontSize: 24, marginBottom: 24 }}>Editar POs y Materiales</h2>
      {msg && <div style={{ marginBottom: 16, color: "#2563eb" }}>{msg}</div>}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center" }}>Cargando datos...</div>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8 }}>
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>No. De recibo</th>
                <th>Usuario</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {recibos.map(recibo => (
                <tr key={recibo.ticket_id}>
                  <td>{recibo.ticket_id}</td>
                  <td>{recibo.numero_recibo}</td>
                  <td>{recibo.usuario}</td>
                  <td>{recibo.status}</td>
                  <td>
                    <button onClick={() => handleEditRecibo(recibo)}>Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {editReciboId && (
            <div style={{ marginTop: 32, background: "#f1f5f9", padding: 24, borderRadius: 8 }}>
              <h3>Editar Recibo</h3>
              <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                <input
                  type="text"
                  value={editReciboData.usuario}
                  onChange={e => setEditReciboData((d: any) => ({ ...d, usuario: e.target.value }))}
                  placeholder="Usuario"
                />
                <input
                  type="text"
                  value={editReciboData.numero_recibo}
                  onChange={e => setEditReciboData((d: any) => ({ ...d, numero_recibo: e.target.value }))}
                  placeholder="No. de recibo"
                />
                <input
                  type="text"
                  value={editReciboData.status}
                  onChange={e => setEditReciboData((d: any) => ({ ...d, status: e.target.value }))}
                  placeholder="Estado"
                />
                <button onClick={handleSaveRecibo}>Guardar Recibo</button>
              </div>
              <h3>Materiales</h3>
              <table style={{ width: "100%", marginBottom: 16 }}>
                <thead>
                  <tr>
                    <th>Grid Value</th>
                    <th>Stock Category</th>
                    <th>Cantidad</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {editMateriales.map((mat, idx) => (
                    <tr key={mat.material_id ?? idx}>
                      <td>
                        <input
                          type="text"
                          value={mat.grid_value}
                          onChange={e => {
                            const val = e.target.value;
                            setEditMateriales(ls => ls.map((l, i) => i === idx ? { ...l, grid_value: val } : l));
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={mat.stock_category}
                          onChange={e => {
                            const val = e.target.value;
                            setEditMateriales(ls => ls.map((l, i) => i === idx ? { ...l, stock_category: val } : l));
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={mat.cantidad}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setEditMateriales(ls => ls.map((l, i) => i === idx ? { ...l, cantidad: val } : l));
                          }}
                        />
                      </td>
                      <td>
                        {mat.material_id && (
                          <button onClick={() => handleDeleteMaterial(mat.material_id)}>Eliminar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={handleAddMaterial} style={{ marginRight: 8 }}>Agregar material</button>
              <button onClick={handleSaveMateriales} style={{ marginRight: 8 }}>Guardar cambios materiales</button>
              <button onClick={handleSaveNewMateriales}>Guardar nuevos materiales</button>
              <button onClick={handleCloseEdit} style={{ marginLeft: 16 }}>Cerrar</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OpenPos;