// src/pages/Overs.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import Loading from '../components/Loading';
import { useNotifications } from '../contexts/NotificationContext';
import { Toaster, toast } from 'react-hot-toast';
import '../styles/overs.css';

interface Over {
  id: number;
  fecha: string;
  material: string;
  grid_value: string;
  qty: number;
  unit: string;
  stock_category: string;
  no_po: string;
  usuario_id: string; // UUID
  usuario_nombre?: string; // Nombre obtenido dinámicamente
}

const Overs = () => {
  const [overs, setOvers] = useState<Over[]>([]);
  const [filteredOvers, setFilteredOvers] = useState<Over[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [newLine, setNewLine] = useState('');
  const [agentName, setAgentName] = useState<string>(''); // Nombre del usuario autenticado

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

  // Cargar Overs y añadir nombre del usuario desde user_profiles
  const fetchOvers = async () => {
    try {
      setLoading(true);

      // Traer Overs
      const { data: oversData, error: oversError } = await supabase
        .from('overs')
        .select('*')
        .order('fecha', { ascending: false });

      if (oversError) throw oversError;

      // Traer todos los usuarios relacionados para mapear nombres
      const userIds = oversData?.map((o) => o.usuario_id) || [];
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', userIds);

      // Mapear nombre al Over
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

  // Filtrado rápido
  useEffect(() => {
    if (!searchTerm) setFilteredOvers(overs);
    else {
      setFilteredOvers(
        overs.filter(
          (o) =>
            o.material.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.grid_value.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.stock_category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.no_po.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (o.usuario_nombre?.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      );
    }
  }, [searchTerm, overs]);

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
          usuario_id: user.id, // Guardamos solo el UUID
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

  if (loading) return <Loading message="Cargando Overs..." />;

  return (
    <>
      <Toaster position="top-right" />
      <div className="overs-container p-4">
        <div className="flex justify-between mb-4">
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="overs-search"
          />
          <button
            className="button-primary"
            onClick={() => setModalOpen(true)}
          >
            + Nuevo Over
          </button>
        </div>

        <div className="overs-table-container">
          <table className="overs-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Material</th>
                <th>Grid Value</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Stockcat.</th>
                <th>No. PO</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              {filteredOvers.map((o) => (
                <tr key={o.id}>
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

        {/* Modal */}
        {modalOpen && (
          <div className="overs-modal-backdrop">
            <div className="overs-modal">
              <h2>Nuevo Over</h2>
              <p className="text-sm text-gray-600 mb-2">
                Pega la línea: <span className="font-mono">Material GridValue Qty Unit Stockcat. NoPO</span>
              </p>
              <textarea
                rows={2}
                className="border w-full p-2 rounded mb-4"
                value={newLine}
                onChange={(e) => setNewLine(e.target.value)}
                placeholder="0AX4154SU	83622A56	1	NR	BRA999999	480123131"
              />
              <div className="flex justify-end gap-2">
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
                  Guardar
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
