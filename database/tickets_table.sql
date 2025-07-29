-- Estructura SQL recomendada para la tabla tickets en Supabase
-- Ejecuta este SQL en el Editor SQL de Supabase

-- Crear la tabla tickets
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    location VARCHAR(255),
    tote_number VARCHAR(100),
    stock_id VARCHAR(100),
    chat_id UUID REFERENCES public.chats(id) ON DELETE SET NULL,
    type VARCHAR(50) DEFAULT 'general',
    "user" VARCHAR(255), -- Operador que crea el ticket
    created_by VARCHAR(255), -- Agente que creó el ticket
    title VARCHAR(255),
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category VARCHAR(50) DEFAULT 'general',
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    assigned_to VARCHAR(255),
    resolution TEXT,
    due_date TIMESTAMPTZ
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_type ON public.tickets(type);
CREATE INDEX IF NOT EXISTS idx_tickets_location ON public.tickets(location);
CREATE INDEX IF NOT EXISTS idx_tickets_tote_number ON public.tickets(tote_number);
CREATE INDEX IF NOT EXISTS idx_tickets_stock_id ON public.tickets(stock_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON public.tickets("user");
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON public.tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_chat_id ON public.tickets(chat_id);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_tickets_updated_at ON public.tickets;
CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Política básica de seguridad (ajustar según necesidades)
-- Permitir a todos los usuarios autenticados leer y escribir tickets
CREATE POLICY "Users can view all tickets" ON public.tickets
    FOR SELECT USING (true);

CREATE POLICY "Users can insert tickets" ON public.tickets
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update tickets" ON public.tickets
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete tickets" ON public.tickets
    FOR DELETE USING (true);

-- Insertar algunos datos de ejemplo
INSERT INTO public.tickets (status, location, tote_number, stock_id, type, "user", created_by, title, description) VALUES
('open', 'Almacén A-01', 'TOTE-001', 'STK-12345', 'exception', 'operator_01', 'agent_maria', 'Excepción en tote', 'Productos faltantes en el tote especificado'),
('in_progress', 'Almacén B-03', 'TOTE-002', 'STK-12346', 'inventory', 'operator_02', 'agent_carlos', 'Conteo de inventario', 'Discrepancia en el conteo de stock'),
('resolved', 'Almacén C-05', 'TOTE-003', 'STK-12347', 'technical', 'operator_03', 'agent_ana', 'Error del sistema', 'Sistema no responde en la ubicación especificada'),
('closed', 'Almacén A-02', 'TOTE-004', 'STK-12348', 'general', 'operator_01', 'agent_luis', 'Consulta general', 'Pregunta sobre procedimientos'),
('open', 'Almacén D-01', 'TOTE-005', 'STK-12349', 'exception', 'operator_04', 'agent_sofia', 'Producto dañado', 'Producto encontrado en mal estado');

-- Comentarios sobre el diseño de la tabla:
/*
1. id: UUID único para cada ticket
2. chat_id: Referencia opcional al chat que originó el ticket
3. title: Título descriptivo del ticket
4. description: Descripción detallada del problema
5. status: Estado actual del ticket (open, in_progress, resolved, closed)
6. priority: Prioridad del ticket (low, medium, high, urgent)
7. category: Categoría del ticket para clasificación
8. customer_name: Nombre del cliente que reporta el problema
9. customer_email: Email del cliente para comunicación
10. assigned_to: ID o nombre del agente asignado
11. resolution: Descripción de la solución aplicada
12. due_date: Fecha límite para resolver el ticket
13. created_at: Fecha de creación automática
14. updated_at: Fecha de última actualización automática

Características adicionales:
- Índices para consultas eficientes
- Trigger para actualizar updated_at automáticamente
- Constraints para validar valores de status y priority
- RLS habilitado para seguridad
- Políticas básicas de seguridad
*/
