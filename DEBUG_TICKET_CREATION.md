# Debugging del Error de Creación de Tickets

## Problema
El formulario de tickets muestra "Error al guardar el ticket. Por favor intenta de nuevo." al intentar crear un nuevo ticket.

## Pasos para Debuggear

### 1. Verificar Console Logs
Abre la consola del navegador (F12) y busca los siguientes logs al intentar crear un ticket:

- `Form data being submitted:` - Muestra los datos del formulario
- `Creating new ticket` - Confirma que está intentando crear
- `Ticket data to create:` - Muestra los datos procesados
- `Supabase error:` - Muestra errores específicos de la base de datos

### 2. Probar Conexión a Base de Datos
Haz clic en el botón "Test DB" en el formulario para verificar:
- Si la conexión a Supabase funciona
- Si la tabla `tickets` existe
- Si hay errores de permisos

### 3. Verificar Estructura de la Tabla
Ejecuta el SQL script `database/verify_tickets_table.sql` en Supabase para:
- Verificar que la tabla existe
- Crear la tabla si no existe
- Verificar la estructura de columnas

### 4. Problemas Comunes

#### A. Tabla no existe
```sql
-- Ejecutar en Supabase SQL Editor
CREATE TABLE tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    status VARCHAR(20) DEFAULT 'open',
    location VARCHAR(255),
    tote_number VARCHAR(100),
    stock_id VARCHAR(100),
    type VARCHAR(50) DEFAULT 'general',
    "user" VARCHAR(255),
    created_by VARCHAR(255),
    title VARCHAR(500),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### B. Permisos de RLS (Row Level Security)
```sql
-- Desactivar RLS temporalmente para testing
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;

-- O crear políticas apropiadas
CREATE POLICY "Allow all operations" ON tickets FOR ALL USING (true);
```

#### C. Campos requeridos faltantes
Verificar que todos los campos NOT NULL en la tabla tienen valores por defecto o se están enviando.

### 5. Datos de Prueba Mínimos
Para testing, usar estos datos mínimos:
```javascript
{
  status: 'open',
  location: 'Test Location',
  type: 'general',
  user: 'Test User',
  created_by: 'Test Agent'
}
```

### 6. Verificar en Supabase Dashboard
1. Ve a Supabase Dashboard
2. Navega a Table Editor
3. Verifica que la tabla `tickets` existe
4. Revisa Authentication > Policies para RLS

## Logs Esperados (Exitosos)
```
Testing database connection...
Database connection successful: [...]
Form data being submitted: {...}
Creating new ticket
Ticket data to create: {...}
Processed ticket data: {...}
Created ticket: {...}
```

## Logs de Error Comunes
```
Database connection error: {...}
Supabase error: {...}
Error saving ticket: {...}
```
