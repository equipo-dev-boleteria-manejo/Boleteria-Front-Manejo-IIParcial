# ==============================================================================
# SISTEMA DE BOLETERÍA INTERPROVINCIAL - BASE DE DATOS SUPABASE POSTGRESQL
# PROYECTO SEGUNDO PARCIAL - MANEJO Y CONFIGURACIÓN DEL SOFTWARE
# ==============================================================================

-- 1. TABLA COOPERATIVAS (Identidad y Branding Configurable)
CREATE TABLE IF NOT EXISTS "Cooperativas" (
    "Id" SERIAL PRIMARY KEY,
    "Nombre" VARCHAR(150) NOT NULL UNIQUE,
    "Ruc" VARCHAR(13) NOT NULL UNIQUE,
    "LogoUrl" TEXT,
    "ColorPrimario" VARCHAR(20) DEFAULT '#1e40af',
    "ColorSecundario" VARCHAR(20) DEFAULT '#3b82f6',
    "RedesSociales" JSONB DEFAULT '{}'::jsonb,
    "TelefonoSoporte" VARCHAR(20),
    "Email" VARCHAR(100),
    "Estado" VARCHAR(20) DEFAULT 'Activa' CHECK ("Estado" IN ('Activa', 'Inactiva')),
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA USUARIOS (Roles y Gobernanza de Acceso)
CREATE TABLE IF NOT EXISTS "Usuarios" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Email" VARCHAR(150) NOT NULL UNIQUE,
    "Cedula" VARCHAR(10) NOT NULL UNIQUE,
    "Nombres" VARCHAR(100) NOT NULL,
    "Apellidos" VARCHAR(100) NOT NULL,
    "Rol" VARCHAR(30) NOT NULL CHECK ("Rol" IN ('admin', 'encargado', 'oficinista', 'chofer', 'cliente')),
    "Activo" BOOLEAN DEFAULT TRUE,
    "CooperativaId" INT REFERENCES "Cooperativas"("Id") ON DELETE SET NULL,
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA BUSES (Gestión de Flota)
CREATE TABLE IF NOT EXISTS "Buses" (
    "Id" SERIAL PRIMARY KEY,
    "CooperativaId" INT NOT NULL REFERENCES "Cooperativas"("Id") ON DELETE CASCADE,
    "Numero" VARCHAR(20) NOT NULL,
    "Placa" VARCHAR(10) NOT NULL UNIQUE,
    "TotalAsientos" INT NOT NULL CHECK ("TotalAsientos" > 0),
    "MarcaChasis" VARCHAR(50),
    "MarcaCarroceria" VARCHAR(50),
    "Anio" INT,
    "FotoUrl" TEXT,
    "Estructura" VARCHAR(20) DEFAULT 'UnPiso' CHECK ("Estructura" IN ('UnPiso', 'DosPisos')),
    "Estado" VARCHAR(30) DEFAULT 'Activo' CHECK ("Estado" IN ('Activo', 'Inactivo', 'FueraDeServicio', 'Mantenimiento')),
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT "Uq_Bus_Numero_Coop" UNIQUE ("CooperativaId", "Numero")
);

-- 4. TABLA CONFIGURACION ASIENTOS & TIPOS
CREATE TABLE IF NOT EXISTS "SeatTypes" (
    "Id" SERIAL PRIMARY KEY,
    "Nombre" VARCHAR(50) NOT NULL UNIQUE,
    "ColorHex" VARCHAR(10) NOT NULL,
    "PrecioBase" NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    "Descripcion" TEXT,
    "Estado" BOOLEAN DEFAULT TRUE
);

INSERT INTO "SeatTypes" ("Nombre", "ColorHex", "PrecioBase", "Descripcion") VALUES
('Normal', '#3498db', 10.00, 'Asiento clásico estándar'),
('VIP', '#e74c3c', 15.00, 'Asiento VIP con reclinación superior'),
('Executivo', '#f39c12', 12.50, 'Asiento semi-cama ejecutivo')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS "Asientos" (
    "Id" SERIAL PRIMARY KEY,
    "BusId" INT NOT NULL REFERENCES "Buses"("Id") ON DELETE CASCADE,
    "NumeroAsiento" VARCHAR(10) NOT NULL,
    "Tipo" VARCHAR(30) DEFAULT 'Normal',
    "Fila" VARCHAR(5),
    "Columna" VARCHAR(5),
    "Piso" INT DEFAULT 1,
    "Disponible" BOOLEAN DEFAULT TRUE,
    CONSTRAINT "Uq_Asiento_Bus" UNIQUE ("BusId", "NumeroAsiento")
);

-- 5. TABLA FRECUENCIAS (Rutas Aprobadas por la ANT)
CREATE TABLE IF NOT EXISTS "Frecuencias" (
    "Id" SERIAL PRIMARY KEY,
    "CooperativaId" INT NOT NULL REFERENCES "Cooperativas"("Id") ON DELETE CASCADE,
    "CiudadOrigen" VARCHAR(100) NOT NULL,
    "CiudadDestino" VARCHAR(100) NOT NULL,
    "HoraSalida" TIME NOT NULL,
    "EsDirecto" BOOLEAN DEFAULT TRUE,
    "CodigoAnt" VARCHAR(50),
    "ResolucionAnt" VARCHAR(100),
    "IdentificadorFrecuencia" VARCHAR(50) NOT NULL,
    "DiasOperacion" TEXT[] DEFAULT ARRAY['Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo'],
    "Activa" BOOLEAN DEFAULT TRUE,
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ParadasIntermedias" (
    "Id" SERIAL PRIMARY KEY,
    "FrecuenciaId" INT NOT NULL REFERENCES "Frecuencias"("Id") ON DELETE CASCADE,
    "Ciudad" VARCHAR(100) NOT NULL,
    "Orden" INT NOT NULL,
    "MinutosDesdeOrigen" INT NOT NULL,
    "PermiteVenta" BOOLEAN DEFAULT TRUE,
    "CostoProporcional" NUMERIC(10,2) DEFAULT 0.00
);

-- 6. TABLA HOJAS DE RUTA Y RUTAS ACTIVAS
CREATE TABLE IF NOT EXISTS "HojasRuta" (
    "Id" SERIAL PRIMARY KEY,
    "UsuarioCreadorId" UUID REFERENCES "Usuarios"("Id"),
    "Fecha" DATE NOT NULL,
    "Estado" VARCHAR(30) DEFAULT 'Borrador' CHECK ("Estado" IN ('Borrador', 'Emitida', 'Cerrada')),
    "TipoGeneracion" VARCHAR(20) DEFAULT 'Manual',
    "Observaciones" TEXT,
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Rutas" (
    "Id" SERIAL PRIMARY KEY,
    "FrecuenciaId" INT NOT NULL REFERENCES "Frecuencias"("Id"),
    "BusId" INT NOT NULL REFERENCES "Buses"("Id"),
    "ChoferId" UUID REFERENCES "Usuarios"("Id"),
    "HojaRutaId" INT REFERENCES "HojasRuta"("Id") ON DELETE SET NULL,
    "Fecha" DATE NOT NULL,
    "HoraSalida" TIME,
    "HoraLlegada" TIME,
    "Estado" VARCHAR(30) DEFAULT 'Programada' CHECK ("Estado" IN ('Programada', 'EnCurso', 'Finalizada', 'Cancelada')),
    "EsDirecta" BOOLEAN DEFAULT TRUE,
    "ObservacionChofer" TEXT,
    "TiempoViajeMinutos" INT,
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLA VENTAS Y BOLETOS
CREATE TABLE IF NOT EXISTS "Ventas" (
    "Id" SERIAL PRIMARY KEY,
    "UsuarioVendedorId" UUID REFERENCES "Usuarios"("Id"),
    "RutaId" INT NOT NULL REFERENCES "Rutas"("Id"),
    "CiudadOrigenVenta" VARCHAR(100) NOT NULL,
    "CiudadDestinoVenta" VARCHAR(100) NOT NULL,
    "Total" NUMERIC(10,2) NOT NULL,
    "Estado" VARCHAR(30) DEFAULT 'Pendiente' CHECK ("Estado" IN ('Pendiente', 'AprobadaPago', 'Cancelada')),
    "MetodoPago" VARCHAR(30) NOT NULL CHECK ("MetodoPago" IN ('Efectivo', 'Transferencia', 'Deposito')),
    "ComprobanteUrl" TEXT,
    "AprobadoPorId" UUID REFERENCES "Usuarios"("Id"),
    "FechaVenta" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Boletos" (
    "Id" SERIAL PRIMARY KEY,
    "VentaId" INT NOT NULL REFERENCES "Ventas"("Id") ON DELETE CASCADE,
    "RutaId" INT NOT NULL REFERENCES "Rutas"("Id"),
    "AsientoId" INT NOT NULL REFERENCES "Asientos"("Id"),
    "CedulaPasajero" VARCHAR(10) NOT NULL,
    "NombresPasajero" VARCHAR(100) NOT NULL,
    "ApellidosPasajero" VARCHAR(100) NOT NULL,
    "TipoPasajero" VARCHAR(30) DEFAULT 'General' CHECK ("TipoPasajero" IN ('General', 'TerceraEdad', 'Discapacitado', 'MenorEdad')),
    "Estado" VARCHAR(30) DEFAULT 'Reservado' CHECK ("Estado" IN ('Reservado', 'Proceso de validacion', 'Aprobado', 'Emitido', 'Cancelado', 'Abordado', 'NoAbordo')),
    "CodigoQr" TEXT,
    "CodigoBarras" TEXT,
    "PrecioFinal" NUMERIC(10,2) NOT NULL,
    "SubRutaOrigen" VARCHAR(100),
    "SubRutaDestino" VARCHAR(100),
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ValidacionesBoleto" (
    "Id" SERIAL PRIMARY KEY,
    "BoletoId" INT NOT NULL REFERENCES "Boletos"("Id"),
    "ChoferId" UUID NOT NULL REFERENCES "Usuarios"("Id"),
    "FechaValidacion" TIMESTAMPTZ DEFAULT NOW(),
    "Resultado" VARCHAR(20) NOT NULL CHECK ("Resultado" IN ('Valido', 'Invalido', 'Duplicado')),
    "Dispositivo" TEXT
);

-- 8. TABLA CAMBIOS (Gestión de Configuración y Comité CCB - ITIL 4 / IEEE 828)
CREATE TABLE IF NOT EXISTS "Cambios" (
    "Id" SERIAL PRIMARY KEY,
    "Titulo" VARCHAR(200) NOT NULL,
    "Descripcion" TEXT NOT NULL,
    "TipoCambio" VARCHAR(30) NOT NULL CHECK ("TipoCambio" IN ('Normal', 'Estandar', 'Emergencia')),
    "Prioridad" VARCHAR(20) NOT NULL CHECK ("Prioridad" IN ('Baja', 'Media', 'Alta', 'Critica')),
    "Estado" VARCHAR(30) DEFAULT 'Solicitado' CHECK ("Estado" IN ('Solicitado', 'EnEvaluacion', 'Aprobado', 'Rechazado', 'EnDesarrollo', 'Implementado')),
    "SolicitadoPor" VARCHAR(100) NOT NULL,
    "AprobadoPorCCB" VARCHAR(100),
    "FechaSolicitud" TIMESTAMPTZ DEFAULT NOW(),
    "FechaAprobacion" TIMESTAMPTZ,
    "FechaImplementacion" TIMESTAMPTZ,
    "GithubIssueUrl" TEXT,
    "ImpactoEstimado" TEXT
);

-- 9. CONFIGURACIÓN DE STORAGE BUCKETS (Públicos para la app)
-- Nota: En Supabase Storage, crear los buckets: 'comprobantes', 'logos', 'buses'
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('comprobantes', 'comprobantes', true),
    ('logos', 'logos', true),
    ('buses', 'buses', true)
ON CONFLICT (id) DO NOTHING;
