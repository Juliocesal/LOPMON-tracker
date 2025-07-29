import React, { useState, useEffect } from 'react';
import Loading from '../components/Loading';

const CreateTicket = () => {
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'low',
  });

  useEffect(() => {
    // Simulate loading time for form initialization
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Datos del ticket:', formData);
    // Aquí puedes enviar los datos a una API o realizar otras acciones
  };

  if (loading) {
    return <Loading message="Preparando formulario..." />;
  }

  return (
    <div className="section">
      
      <h2>Crear Nuevo Ticket</h2>
      <form className="ticket-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="ticket-title">Título del Ticket</label>
          <input
            type="text"
            id="ticket-title"
            name="title"
            placeholder="Ej. Falta de inventario"
            value={formData.title}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="ticket-description">Descripción</label>
          <textarea
            id="ticket-description"
            name="description"
            placeholder="Describe el problema..."
            value={formData.description}
            onChange={handleChange}
          ></textarea>
        </div>
        <div className="form-group">
          <label htmlFor="ticket-category">Categoría</label>
          <select
            id="ticket-category"
            name="category"
            value={formData.category}
            onChange={handleChange}
          >
            <option value="inventory">Inventario</option>
            <option value="maintenance">Mantenimiento</option>
            <option value="sales">Ventas</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="ticket-priority">Prioridad</label>
          <select
            id="ticket-priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
          >
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
          </select>
        </div>
        <button type="submit" className="btn-primary">Crear Ticket</button>
      </form>
    </div>
  );
};

export default CreateTicket;