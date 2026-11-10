#!/usr/bin/env node
/**
 * seed-test-data.mjs - Datos de prueba persistentes para las vistas de venta.
 *
 * Crea (o recrea) un escenario completo en Supabase para validar manualmente:
 *   - BuscarRutas.vue        (cliente)
 *   - MisBoletos.vue         (cliente)
 *   - AprobarPago.vue        (oficinista)
 *   - VentaBoletos.vue       (oficinista)
 *
 * El script es idempotente: antes de sembrar elimina únicamente los registros
 * marcados como demo (RUC, placas, frecuencias TEST-, correos @boleteria-demo.com
 * y todo lo que cuelgue de ellos). No toca datos reales del proyecto.
 *
 * Uso:
 *   1. Copiar .env.example a .env y completar:
 *        SUPABASE_URL=https://tu-proyecto.supabase.co
 *        SUPABASE_SERVICE_ROLE_KEY=...   # Settings > API > service_role (secreta)
 *   2. npm run seed:test
 *
 * La service_role key solo se usa en este script local. Nunca debe exponerse
 * en variables VITE_* ni en el navegador.
 */

import { existsSync, readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const DOMINIO_DEMO = 'boleteria-demo.com'
const PASSWORD_DEMO = 'Demo1234!'
const COOP_RUC = '1799999999001'
const COOP_NOMBRE = 'Cooperativa Demo Boletería'
const PLACAS_DEMO = ['TST-001', 'TST-002']
const PREFIJO_FRECUENCIA = 'TEST-'
const BUCKET_COMPROBANTES = 'comprobantes'
const RUTA_COMPROBANTE = 'demo/transferencia-demo.svg'

const CUENTAS_DEMO = [
  {
    clave: 'cliente',
    email: `cliente.demo@${DOMINIO_DEMO}`,
    cedula: '1712345675',
    nombres: 'Andrea',
    apellidos: 'Cliente Demo',
    rol: 'cliente',
    conCooperativa: false,
  },
  {
    clave: 'cliente2',
    email: `cliente2.demo@${DOMINIO_DEMO}`,
    cedula: '1712345717',
    nombres: 'Bruno',
    apellidos: 'Cliente Demo',
    rol: 'cliente',
    conCooperativa: false,
  },
  {
    clave: 'oficinista',
    email: `oficinista.demo@${DOMINIO_DEMO}`,
    cedula: '1712345683',
    nombres: 'Oscar',
    apellidos: 'Oficinista Demo',
    rol: 'oficinista',
    conCooperativa: true,
  },
  {
    clave: 'admin',
    email: `admin.demo@${DOMINIO_DEMO}`,
    cedula: '1712345691',
    nombres: 'Alicia',
    apellidos: 'Admin Demo',
    rol: 'admin',
    conCooperativa: true,
  },
  {
    clave: 'chofer',
    email: `chofer.demo@${DOMINIO_DEMO}`,
    cedula: '1712345709',
    nombres: 'César',
    apellidos: 'Chofer Demo',
    rol: 'chofer',
    conCooperativa: true,
  },
]

const FRECUENCIAS_DEMO = [
  {
    clave: 'uio-gye-0700',
    identificador: 'TEST-UIO-GYE-0700',
    origen: 'Quito',
    destino: 'Guayaquil',
    hora: '07:00:00',
    directo: true,
    activa: true,
    paradas: [
      { ciudad: 'Santo Domingo', orden: 1, minutos: 120, permiteVenta: true, costo: 6.0 },
    ],
  },
  {
    clave: 'uio-gye-1430',
    identificador: 'TEST-UIO-GYE-1430',
    origen: 'Quito',
    destino: 'Guayaquil',
    hora: '14:30:00',
    directo: false,
    activa: true,
    paradas: [
      { ciudad: 'Santo Domingo', orden: 1, minutos: 120, permiteVenta: true, costo: 6.0 },
      { ciudad: 'Quevedo', orden: 2, minutos: 240, permiteVenta: true, costo: 8.0 },
    ],
  },
  {
    clave: 'gye-uio-0800',
    identificador: 'TEST-GYE-UIO-0800',
    origen: 'Guayaquil',
    destino: 'Quito',
    hora: '08:00:00',
    directo: true,
    activa: true,
    paradas: [],
  },
  {
    clave: 'uio-cue-0900',
    identificador: 'TEST-UIO-CUE-0900',
    origen: 'Quito',
    destino: 'Cuenca',
    hora: '09:00:00',
    directo: false,
    activa: true,
    paradas: [
      { ciudad: 'Alausí', orden: 1, minutos: 180, permiteVenta: true, costo: 7.5 },
    ],
  },
  {
    clave: 'uio-amb-0630',
    identificador: 'TEST-UIO-AMB-0630',
    origen: 'Quito',
    destino: 'Ambato',
    hora: '06:30:00',
    directo: true,
    activa: false,
    paradas: [],
  },
]

const RUTAS_DEMO = [
  {
    clave: 'r1',
    frecuencia: 'uio-gye-0700',
    placa: 'TST-001',
    fecha: fechaISO(0),
    horaSalida: '07:00:00',
    horaLlegada: '11:30:00',
    estado: 'Programada',
    conChofer: true,
    observacion: 'Ruta demo de hoy (Quito - Guayaquil)',
  },
  {
    clave: 'r2',
    frecuencia: 'uio-gye-0700',
    placa: 'TST-001',
    fecha: fechaISO(1),
    horaSalida: '07:00:00',
    horaLlegada: '11:30:00',
    estado: 'Programada',
    conChofer: true,
    observacion: 'Ruta demo mañana con boletos vendidos',
  },
  {
    clave: 'r3',
    frecuencia: 'uio-gye-1430',
    placa: 'TST-002',
    fecha: fechaISO(2),
    horaSalida: '14:30:00',
    horaLlegada: '19:00:00',
    estado: 'Programada',
    conChofer: true,
    observacion: 'Ruta demo en bus de dos pisos',
  },
  {
    clave: 'r4',
    frecuencia: 'gye-uio-0800',
    placa: 'TST-002',
    fecha: fechaISO(0),
    horaSalida: '08:00:00',
    horaLlegada: '12:30:00',
    estado: 'EnCurso',
    conChofer: true,
    observacion: 'Ruta demo en curso',
  },
  {
    clave: 'r5',
    frecuencia: 'uio-cue-0900',
    placa: 'TST-002',
    fecha: fechaISO(3),
    horaSalida: '09:00:00',
    horaLlegada: '15:00:00',
    estado: 'Programada',
    conChofer: false,
    observacion: 'Ruta demo Quito - Cuenca',
  },
  {
    clave: 'r6',
    frecuencia: 'uio-amb-0630',
    placa: 'TST-001',
    fecha: fechaISO(1),
    horaSalida: '06:30:00',
    horaLlegada: '09:30:00',
    estado: 'Programada',
    conChofer: false,
    observacion: 'Ruta demo de frecuencia inactiva (debe ocultarse)',
  },
  {
    clave: 'r7',
    frecuencia: 'uio-gye-0700',
    placa: 'TST-001',
    fecha: fechaISO(-2),
    horaSalida: '07:00:00',
    horaLlegada: '11:30:00',
    estado: 'Finalizada',
    conChofer: true,
    observacion: 'Ruta demo pasada con historial de boletos',
  },
  {
    clave: 'r8',
    frecuencia: 'uio-gye-1430',
    placa: 'TST-001',
    fecha: fechaISO(4),
    horaSalida: '14:30:00',
    horaLlegada: '19:00:00',
    estado: 'Cancelada',
    conChofer: false,
    observacion: 'Ruta demo cancelada (debe ocultarse)',
  },
  {
    clave: 'r9',
    frecuencia: 'gye-uio-0800',
    placa: 'TST-001',
    fecha: fechaISO(5),
    horaSalida: '08:00:00',
    horaLlegada: '12:30:00',
    estado: 'Programada',
    conChofer: false,
    observacion: 'Ruta demo futura Guayaquil - Quito',
  },
]

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function fechaISO(offsetDias = 0) {
  return new Date(Date.now() + offsetDias * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
}

function haceDias(dias) {
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString()
}

function esEmailDemo(email) {
  return String(email ?? '').toLowerCase().endsWith(`@${DOMINIO_DEMO}`)
}

function unicos(valores) {
  return [...new Set(valores.filter((valor) => valor !== undefined && valor !== null))]
}

function cargarEnvLocal() {
  for (const archivo of ['.env.local', '.env']) {
    if (!existsSync(archivo)) continue
    const contenido = readFileSync(archivo, 'utf8')
    for (const lineaCruda of contenido.split(/\r?\n/)) {
      const linea = lineaCruda.trim()
      if (!linea || linea.startsWith('#')) continue
      const separador = linea.indexOf('=')
      if (separador === -1) continue
      const clave = linea.slice(0, separador).trim()
      let valor = linea.slice(separador + 1).trim()
      if (
        (valor.startsWith('"') && valor.endsWith('"')) ||
        (valor.startsWith("'") && valor.endsWith("'"))
      ) {
        valor = valor.slice(1, -1)
      }
      if (clave && process.env[clave] === undefined) {
        process.env[clave] = valor
      }
    }
  }
}

function requerirConfiguracion() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

  if (!url || !serviceRoleKey) {
    console.error('\n[error] Faltan credenciales de Supabase.')
    console.error('Configura en .env (o en el entorno):')
    console.error('  SUPABASE_URL=https://tu-proyecto.supabase.co')
    console.error('  SUPABASE_SERVICE_ROLE_KEY=<service_role key>')
    console.error('\nLa service_role key está en Supabase > Settings > API.')
    console.error('No la publiques ni la prefijes con VITE_.\n')
    process.exit(1)
  }

  return { url, serviceRoleKey }
}

function crearCliente(url, serviceRoleKey) {
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

let supabase

function validarRespuesta(resultado, contexto) {
  if (resultado.error) {
    throw new Error(`[${contexto}] ${resultado.error.message}`)
  }
  return resultado.data
}

async function insertarUno(tabla, fila) {
  const resultado = await supabase.from(tabla).insert(fila).select('*').single()
  return validarRespuesta(resultado, `insertar en ${tabla}`)
}

async function insertarVarios(tabla, filas) {
  if (!filas.length) return []
  const resultado = await supabase.from(tabla).insert(filas).select('*')
  return validarRespuesta(resultado, `insertar en ${tabla}`)
}

async function seleccionarIds(tabla, columna, valores) {
  if (!valores.length) return []
  const resultado = await supabase.from(tabla).select('Id').in(columna, valores)
  return (validarRespuesta(resultado, `consultar ${tabla}`) ?? []).map((fila) => fila.Id)
}

async function eliminarPorIds(tabla, ids) {
  if (!ids.length) return
  const resultado = await supabase.from(tabla).delete().in('Id', ids)
  validarRespuesta(resultado, `eliminar de ${tabla}`)
}

async function listarUsuariosAuthDemo() {
  const encontrados = []
  let pagina = 1

  while (pagina <= 100) {
    const resultado = await supabase.auth.admin.listUsers({ page: pagina, perPage: 200 })
    const data = validarRespuesta(resultado, 'listar usuarios de Auth')
    const usuarios = data?.users ?? []
    encontrados.push(...usuarios.filter((usuario) => esEmailDemo(usuario.email)))
    if (!data?.nextPage && usuarios.length < 200) break
    pagina = data?.nextPage ?? pagina + 1
  }

  return encontrados
}

// ---------------------------------------------------------------------------
// Limpieza idempotente
// ---------------------------------------------------------------------------

async function limpiarDatosDemo() {
  console.log('[1/6] Limpiando datos demo anteriores...')

  const authDemo = await listarUsuariosAuthDemo()
  const perfiles = validarRespuesta(
    await supabase.from('Usuarios').select('Id, Email, Cedula'),
    'consultar perfiles demo',
  )
  const perfilesDemo = (perfiles ?? []).filter((perfil) => esEmailDemo(perfil.Email))
  const usuariosDemoIds = unicos([
    ...authDemo.map((usuario) => usuario.id),
    ...perfilesDemo.map((perfil) => perfil.Id),
  ])

  const cooperativa = validarRespuesta(
    await supabase.from('Cooperativas').select('Id').eq('Ruc', COOP_RUC).maybeSingle(),
    'buscar cooperativa demo',
  )

  const buses = validarRespuesta(
    await supabase.from('Buses').select('Id').in('Placa', PLACAS_DEMO),
    'buscar buses demo',
  )
  const busIds = (buses ?? []).map((bus) => bus.Id)

  const frecuencias = validarRespuesta(
    await supabase
      .from('Frecuencias')
      .select('Id')
      .like('IdentificadorFrecuencia', `${PREFIJO_FRECUENCIA}%`),
    'buscar frecuencias demo',
  )
  const frecuenciaIds = (frecuencias ?? []).map((frecuencia) => frecuencia.Id)

  const rutasIds = unicos([
    ...(await seleccionarIds('Rutas', 'FrecuenciaId', frecuenciaIds)),
    ...(await seleccionarIds('Rutas', 'BusId', busIds)),
    ...(await seleccionarIds('Rutas', 'ChoferId', usuariosDemoIds)),
  ])

  const ventaIds = unicos([
    ...(await seleccionarIds('Ventas', 'RutaId', rutasIds)),
    ...(await seleccionarIds('Ventas', 'UsuarioVendedorId', usuariosDemoIds)),
    ...(await seleccionarIds('Ventas', 'AprobadoPorId', usuariosDemoIds)),
  ])

  const boletoIds = unicos([
    ...(await seleccionarIds('Boletos', 'VentaId', ventaIds)),
    ...(await seleccionarIds('Boletos', 'RutaId', rutasIds)),
  ])

  const validacionesPorBoleto = await seleccionarIds('ValidacionesBoleto', 'BoletoId', boletoIds)
  const validacionesPorChofer = await seleccionarIds('ValidacionesBoleto', 'ChoferId', usuariosDemoIds)

  await eliminarPorIds('ValidacionesBoleto', unicos([...validacionesPorBoleto, ...validacionesPorChofer]))
  await eliminarPorIds('Boletos', boletoIds)
  await eliminarPorIds('Ventas', ventaIds)
  await eliminarPorIds('Rutas', rutasIds)

  const hojasRuta = await seleccionarIds('HojasRuta', 'UsuarioCreadorId', usuariosDemoIds)
  await eliminarPorIds('HojasRuta', hojasRuta)

  if (frecuenciaIds.length) {
    validarRespuesta(
      await supabase.from('ParadasIntermedias').delete().in('FrecuenciaId', frecuenciaIds),
      'eliminar paradas demo',
    )
  }
  await eliminarPorIds('Frecuencias', frecuenciaIds)

  if (busIds.length) {
    validarRespuesta(
      await supabase.from('Asientos').delete().in('BusId', busIds),
      'eliminar asientos demo',
    )
  }
  await eliminarPorIds('Buses', busIds)
  await eliminarPorIds('Usuarios', usuariosDemoIds)

  for (const usuario of authDemo) {
    const resultado = await supabase.auth.admin.deleteUser(usuario.id)
    if (resultado.error && !/not found|no encontrado/i.test(resultado.error.message)) {
      console.warn(`  [aviso] No se pudo eliminar el usuario Auth ${usuario.email}: ${resultado.error.message}`)
    }
  }

  if (cooperativa?.Id) {
    const resultado = await supabase.from('Cooperativas').delete().eq('Id', cooperativa.Id)
    if (resultado.error) {
      console.warn(
        `  [aviso] La cooperativa demo tiene datos externos y no se eliminó: ${resultado.error.message}`,
      )
    }
  }

  const borradoStorage = await supabase.storage
    .from(BUCKET_COMPROBANTES)
    .remove([RUTA_COMPROBANTE])
  if (borradoStorage.error) {
    console.warn(`  [aviso] No se pudo limpiar el comprobante demo: ${borradoStorage.error.message}`)
  }

  console.log(
    `  Eliminados: ${usuariosDemoIds.length} usuarios, ${rutasIds.length} rutas, ${ventaIds.length} ventas, ${boletoIds.length} boletos.`,
  )
}

// ---------------------------------------------------------------------------
// Siembra
// ---------------------------------------------------------------------------

async function crearCooperativa() {
  const existente = validarRespuesta(
    await supabase
      .from('Cooperativas')
      .select('Id')
      .eq('Ruc', COOP_RUC)
      .maybeSingle(),
    'buscar cooperativa demo',
  )
  if (existente?.Id) return existente.Id

  const cooperativa = await insertarUno('Cooperativas', {
    Nombre: COOP_NOMBRE,
    Ruc: COOP_RUC,
    ColorPrimario: '#1e40af',
    ColorSecundario: '#3b82f6',
    RedesSociales: { facebook: 'https://facebook.com/boleteria-demo' },
    TelefonoSoporte: '0999999999',
    Email: `soporte@${DOMINIO_DEMO}`,
    Estado: 'Activa',
  })
  return cooperativa.Id
}

async function asegurarTiposAsiento() {
  const tiposPorDefecto = [
    { Nombre: 'Normal', ColorHex: '#3498db', PrecioBase: 10.0, Descripcion: 'Asiento clásico estándar', Estado: true },
    { Nombre: 'VIP', ColorHex: '#e74c3c', PrecioBase: 15.0, Descripcion: 'Asiento VIP con reclinación superior', Estado: true },
    { Nombre: 'Executivo', ColorHex: '#f39c12', PrecioBase: 12.5, Descripcion: 'Asiento semi-cama ejecutivo', Estado: true },
  ]

  for (const tipo of tiposPorDefecto) {
    const existente = validarRespuesta(
      await supabase.from('SeatTypes').select('Id').eq('Nombre', tipo.Nombre).maybeSingle(),
      'buscar tipo de asiento',
    )
    if (!existente?.Id) {
      await insertarUno('SeatTypes', tipo)
    }
  }

  const tipos = validarRespuesta(
    await supabase.from('SeatTypes').select('*'),
    'consultar tipos de asiento',
  )
  return new Map((tipos ?? []).map((tipo) => [tipo.Nombre, tipo]))
}

async function crearUsuariosDemo(cooperativaId) {
  const usuarios = {}

  for (const cuenta of CUENTAS_DEMO) {
    let usuarioAuth = null
    let errorCreacion = null

    const creacion = await supabase.auth.admin.createUser({
      email: cuenta.email,
      password: PASSWORD_DEMO,
      email_confirm: true,
      user_metadata: {
        nombres: cuenta.nombres,
        apellidos: cuenta.apellidos,
        cedula: cuenta.cedula,
        rol: cuenta.rol,
      },
    })

    if (creacion.error) {
      errorCreacion = creacion.error
      const existentes = await listarUsuariosAuthDemo()
      usuarioAuth = existentes.find(
        (usuario) => String(usuario.email).toLowerCase() === cuenta.email,
      )
      if (!usuarioAuth) {
        throw new Error(
          `[crear usuario ${cuenta.email}] ${errorCreacion.message}. ` +
            'Si el correo ya existe, elimínalo desde Supabase Auth o vuelve a ejecutar la limpieza.',
        )
      }
      const actualizacion = await supabase.auth.admin.updateUserById(usuarioAuth.id, {
        password: PASSWORD_DEMO,
        email_confirm: true,
        user_metadata: {
          nombres: cuenta.nombres,
          apellidos: cuenta.apellidos,
          cedula: cuenta.cedula,
          rol: cuenta.rol,
        },
      })
      if (actualizacion.error) {
        throw new Error(`[actualizar usuario ${cuenta.email}] ${actualizacion.error.message}`)
      }
    } else {
      usuarioAuth = creacion.data.user
    }

    const perfil = await insertarUno('Usuarios', {
      Id: usuarioAuth.id,
      Email: cuenta.email,
      Cedula: cuenta.cedula,
      Nombres: cuenta.nombres,
      Apellidos: cuenta.apellidos,
      Rol: cuenta.rol,
      Activo: true,
      CooperativaId: cuenta.conCooperativa ? cooperativaId : null,
    })

    usuarios[cuenta.clave] = { ...cuenta, id: perfil.Id }
  }

  return usuarios
}

function generarAsientos(busId, totalAsientos, pisos) {
  const columnas = ['A', 'B', 'C', 'D']
  const asientosPorPiso = Math.ceil(totalAsientos / pisos)
  const asientos = []
  let numero = 1

  for (let piso = 1; piso <= pisos && numero <= totalAsientos; piso++) {
    const restantes = totalAsientos - (numero - 1)
    const capacidadPiso = Math.min(asientosPorPiso, restantes)

    for (let indice = 0; indice < capacidadPiso; indice++) {
      const fila = Math.floor(indice / columnas.length) + 1
      const columna = columnas[indice % columnas.length]
      const tipo = indice < 8 ? 'VIP' : indice < 12 ? 'Executivo' : 'Normal'

      asientos.push({
        BusId: busId,
        NumeroAsiento: String(numero),
        Tipo: tipo,
        Fila: String(fila),
        Columna: columna,
        Piso: piso,
        Disponible: true,
      })
      numero += 1
    }
  }

  return asientos
}

async function crearBusesYAsientos(cooperativaId) {
  const definiciones = [
    {
      Placa: 'TST-001',
      Numero: 'DEMO-01',
      TotalAsientos: 40,
      Estructura: 'UnPiso',
      MarcaChasis: 'Mercedes-Benz',
      MarcaCarroceria: 'Marcopolo',
      Anio: 2022,
    },
    {
      Placa: 'TST-002',
      Numero: 'DEMO-02',
      TotalAsientos: 48,
      Estructura: 'DosPisos',
      MarcaChasis: 'Volvo',
      MarcaCarroceria: 'Hino',
      Anio: 2023,
    },
  ]

  const buses = new Map()
  const asientos = new Map()

  for (const definicion of definiciones) {
    const bus = await insertarUno('Buses', {
      CooperativaId: cooperativaId,
      ...definicion,
      FotoUrl: null,
      Estado: 'Activo',
    })

    const filas = generarAsientos(
      bus.Id,
      bus.TotalAsientos,
      bus.Estructura === 'DosPisos' ? 2 : 1,
    )
    const asientosCreados = await insertarVarios('Asientos', filas)

    buses.set(bus.Placa, bus)
    asientos.set(
      bus.Placa,
      new Map(asientosCreados.map((asiento) => [String(asiento.NumeroAsiento), asiento])),
    )
  }

  return { buses, asientos }
}

async function crearFrecuencias(cooperativaId) {
  const frecuencias = new Map()

  for (const definicion of FRECUENCIAS_DEMO) {
    const frecuencia = await insertarUno('Frecuencias', {
      CooperativaId: cooperativaId,
      CiudadOrigen: definicion.origen,
      CiudadDestino: definicion.destino,
      HoraSalida: definicion.hora,
      EsDirecto: definicion.directo,
      CodigoAnt: `ANT-${definicion.clave.toUpperCase()}`,
      ResolucionAnt: `RES-${definicion.clave.toUpperCase()}`,
      IdentificadorFrecuencia: definicion.identificador,
      DiasOperacion: [
        'Lunes',
        'Martes',
        'Miercoles',
        'Jueves',
        'Viernes',
        'Sabado',
        'Domingo',
      ],
      Activa: definicion.activa,
    })

    if (definicion.paradas.length) {
      await insertarVarios(
        'ParadasIntermedias',
        definicion.paradas.map((parada) => ({
          FrecuenciaId: frecuencia.Id,
          Ciudad: parada.ciudad,
          Orden: parada.orden,
          MinutosDesdeOrigen: parada.minutos,
          PermiteVenta: parada.permiteVenta,
          CostoProporcional: parada.costo,
        })),
      )
    }

    frecuencias.set(definicion.clave, frecuencia)
  }

  return frecuencias
}

async function crearRutas({ frecuencias, buses, usuarios }) {
  const rutas = new Map()

  for (const definicion of RUTAS_DEMO) {
    const frecuencia = frecuencias.get(definicion.frecuencia)
    const bus = buses.get(definicion.placa)

    if (!frecuencia || !bus) {
      throw new Error(`La ruta ${definicion.clave} apunta a una frecuencia o bus inexistente.`)
    }

    const ruta = await insertarUno('Rutas', {
      FrecuenciaId: frecuencia.Id,
      BusId: bus.Id,
      ChoferId: definicion.conChofer ? usuarios.chofer.id : null,
      HojaRutaId: null,
      Fecha: definicion.fecha,
      HoraSalida: definicion.horaSalida,
      HoraLlegada: definicion.horaLlegada,
      Estado: definicion.estado,
      EsDirecta: frecuencia.EsDirecto,
      ObservacionChofer: definicion.observacion,
      TiempoViajeMinutos: 270,
    })

    rutas.set(definicion.clave, {
      ...ruta,
      CiudadOrigen: frecuencia.CiudadOrigen,
      CiudadDestino: frecuencia.CiudadDestino,
      Placa: bus.Placa,
    })
  }

  return rutas
}

async function subirComprobanteDemo() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1100" viewBox="0 0 800 1100">
  <rect width="800" height="1100" fill="#f8fafc"/>
  <rect x="40" y="40" width="720" height="1020" rx="24" fill="#ffffff" stroke="#cbd5e1" stroke-width="3"/>
  <rect x="40" y="40" width="720" height="130" rx="24" fill="#1e40af"/>
  <text x="400" y="100" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="34" font-weight="bold">Comprobante de Transferencia</text>
  <text x="400" y="140" text-anchor="middle" fill="#dbeafe" font-family="Arial, sans-serif" font-size="20">Banco Demo - Cooperativa Demo Boletería</text>
  <text x="90" y="250" fill="#0f172a" font-family="Arial, sans-serif" font-size="22" font-weight="bold">Datos de la operación</text>
  <g fill="#334155" font-family="Arial, sans-serif" font-size="20">
    <text x="90" y="310">Titular:</text><text x="320" y="310" font-weight="bold">Andrea Cliente Demo</text>
    <text x="90" y="355">Cédula:</text><text x="320" y="355" font-weight="bold">1712345675</text>
    <text x="90" y="400">Cuenta origen:</text><text x="320" y="400" font-weight="bold">**** **** 4587</text>
    <text x="90" y="445">Cuenta destino:</text><text x="320" y="445" font-weight="bold">**** **** 9901</text>
    <text x="90" y="490">Concepto:</text><text x="320" y="490" font-weight="bold">Compra de pasajes</text>
    <text x="90" y="535">Ruta:</text><text x="320" y="535" font-weight="bold">Quito - Guayaquil</text>
    <text x="90" y="580">Fecha:</text><text x="320" y="580" font-weight="bold">${fechaISO(0)}</text>
  </g>
  <rect x="90" y="650" width="620" height="140" rx="16" fill="#ecfdf5" stroke="#34d399" stroke-width="2"/>
  <text x="400" y="710" text-anchor="middle" fill="#047857" font-family="Arial, sans-serif" font-size="22">VALOR TRANSFERIDO</text>
  <text x="400" y="765" text-anchor="middle" fill="#065f46" font-family="Arial, sans-serif" font-size="46" font-weight="bold">$ 25.00</text>
  <text x="400" y="880" text-anchor="middle" fill="#64748b" font-family="Arial, sans-serif" font-size="18">Comprobante generado automáticamente para pruebas manuales.</text>
  <text x="400" y="915" text-anchor="middle" fill="#64748b" font-family="Arial, sans-serif" font-size="18">No representa una transacción bancaria real.</text>
  <text x="400" y="1000" text-anchor="middle" fill="#1e40af" font-family="Arial, sans-serif" font-size="18" font-weight="bold">Boletería Front - Seed de pruebas</text>
</svg>`

  const subida = await supabase.storage
    .from(BUCKET_COMPROBANTES)
    .upload(RUTA_COMPROBANTE, Buffer.from(svg, 'utf8'), {
      contentType: 'image/svg+xml',
      upsert: true,
    })

  if (subida.error) {
    console.warn(
      `  [aviso] No se pudo subir el comprobante demo (${subida.error.message}). Se usará una URL de ejemplo.`,
    )
    return 'https://placehold.co/800x1100/png?text=Comprobante+Demo+Transferencia'
  }

  const publica = supabase.storage.from(BUCKET_COMPROBANTES).getPublicUrl(RUTA_COMPROBANTE)
  return publica.data.publicUrl
}

async function crearVenta({ ruta, asientosPorPlaca, tiposAsiento, definicion }) {
  const mapaAsientos = asientosPorPlaca.get(definicion.placa ?? ruta.Placa)
  if (!mapaAsientos) {
    throw new Error(`No hay asientos sembrados para el bus de la ruta ${ruta.Id}.`)
  }

  const boletos = definicion.boletos.map((boleto) => {
    const asiento = mapaAsientos.get(String(boleto.asiento))
    if (!asiento) {
      throw new Error(
        `La venta ${definicion.clave} referencia el asiento ${boleto.asiento}, que no existe.`,
      )
    }
    const tipo = tiposAsiento.get(asiento.Tipo ?? 'Normal')
    const precio = Number(boleto.precio ?? tipo?.PrecioBase ?? 10)

    return {
      AsientoId: asiento.Id,
      CedulaPasajero: boleto.cedula,
      NombresPasajero: boleto.nombres,
      ApellidosPasajero: boleto.apellidos,
      FechaNacimiento: boleto.fechaNacimiento ?? null,
      TipoPasajero: boleto.tipoPasajero ?? 'General',
      EsMenor: Boolean(boleto.esMenor),
      EsDiscapacitado: Boolean(boleto.esDiscapacitado),
      EsTerceraEdad: Boolean(boleto.esTerceraEdad),
      DescuentoAplicado: Number(boleto.descuentoAplicado ?? 0),
      Estado: boleto.estado,
      PrecioFinal: Number(precio.toFixed(2)),
      SubRutaOrigen: boleto.subRutaOrigen ?? null,
      SubRutaDestino: boleto.subRutaDestino ?? null,
    }
  })

  const total = Number(
    boletos.reduce((acumulado, boleto) => acumulado + boleto.PrecioFinal, 0).toFixed(2),
  )
  const fechaVenta = definicion.fechaVenta ?? new Date().toISOString()

  const venta = await insertarUno('Ventas', {
    UsuarioVendedorId: definicion.vendedorId ?? null,
    RutaId: ruta.Id,
    CiudadOrigenVenta: definicion.origen ?? ruta.CiudadOrigen,
    CiudadDestinoVenta: definicion.destino ?? ruta.CiudadDestino,
    Total: total,
    Estado: definicion.estado,
    MetodoPago: definicion.metodoPago,
    ComprobanteUrl: definicion.comprobanteUrl ?? null,
    StripePaymentIntentId: definicion.stripePaymentIntentId ?? null,
    AprobadoPorId: definicion.aprobadoPorId ?? null,
    FechaVenta: fechaVenta,
  })

  const filas = boletos.map((boleto, indice) => ({
    VentaId: venta.Id,
    RutaId: ruta.Id,
    ...boleto,
    CodigoQr: `QR-SEED-V${venta.Id}-A${boleto.AsientoId}-${indice + 1}`,
    CodigoBarras: `BC-SEED-V${venta.Id}-A${boleto.AsientoId}-${indice + 1}`,
    CreatedAt: fechaVenta,
  }))

  const creados = await insertarVarios('Boletos', filas)
  return { venta, boletos: creados }
}

async function crearVentasDemo({ rutas, asientos, tiposAsiento, usuarios, comprobanteUrl }) {
  const ventas = new Map()

  const definiciones = [
    {
      clave: 'pendiente-transferencia',
      rutaKey: 'r2',
      estado: 'Pendiente',
      metodoPago: 'Transferencia',
      comprobanteUrl,
      vendedorId: usuarios.cliente.id,
      fechaVenta: haceDias(1),
      boletos: [
        {
          asiento: 10,
          cedula: '1712345675',
          nombres: 'Andrea',
          apellidos: 'Cliente Demo',
          estado: 'Proceso de validacion',
        },
        {
          asiento: 11,
          cedula: '1712345725',
          nombres: 'Luis',
          apellidos: 'Andrade Demo',
          estado: 'Proceso de validacion',
        },
      ],
    },
    {
      clave: 'tarjeta-aprobada',
      rutaKey: 'r3',
      estado: 'AprobadaPago',
      metodoPago: 'Tarjeta',
      stripePaymentIntentId: 'pi_demo_seed_tarjeta_aprobada',
      aprobadoPorId: usuarios.oficinista.id,
      vendedorId: usuarios.cliente.id,
      fechaVenta: haceDias(2),
      boletos: [
        {
          asiento: 1,
          cedula: '1712345675',
          nombres: 'Andrea',
          apellidos: 'Cliente Demo',
          estado: 'Emitido',
        },
        {
          asiento: 2,
          cedula: '1712345733',
          nombres: 'María',
          apellidos: 'Torres Demo',
          estado: 'Emitido',
        },
      ],
    },
    {
      clave: 'historial-transferencia',
      rutaKey: 'r7',
      estado: 'AprobadaPago',
      metodoPago: 'Transferencia',
      comprobanteUrl,
      aprobadoPorId: usuarios.oficinista.id,
      vendedorId: usuarios.cliente.id,
      fechaVenta: haceDias(5),
      boletos: [
        {
          asiento: 5,
          cedula: '1712345675',
          nombres: 'Andrea',
          apellidos: 'Cliente Demo',
          estado: 'Abordado',
        },
        {
          asiento: 6,
          cedula: '1712345741',
          nombres: 'Carlos',
          apellidos: 'Pérez Demo',
          estado: 'Emitido',
        },
      ],
    },
    {
      clave: 'cancelada',
      rutaKey: 'r2',
      estado: 'Cancelada',
      metodoPago: 'Transferencia',
      comprobanteUrl,
      vendedorId: usuarios.cliente.id,
      fechaVenta: haceDias(3),
      boletos: [
        {
          asiento: 15,
          cedula: '1712345675',
          nombres: 'Andrea',
          apellidos: 'Cliente Demo',
          estado: 'Cancelado',
        },
      ],
    },
    {
      clave: 'pendiente-sin-comprobante',
      rutaKey: 'r2',
      estado: 'Pendiente',
      metodoPago: 'Transferencia',
      comprobanteUrl: null,
      vendedorId: usuarios.cliente2.id,
      fechaVenta: haceDias(1),
      boletos: [
        {
          asiento: 20,
          cedula: '1712345717',
          nombres: 'Bruno',
          apellidos: 'Cliente Demo',
          estado: 'Proceso de validacion',
        },
        {
          asiento: 21,
          cedula: '0912345675',
          nombres: 'Ana',
          apellidos: 'Molina Demo',
          estado: 'Proceso de validacion',
        },
      ],
    },
    {
      clave: 'otro-pasajero-aprobada',
      rutaKey: 'r3',
      estado: 'AprobadaPago',
      metodoPago: 'Efectivo',
      comprobanteUrl: 'PAGO_DIRECTO',
      aprobadoPorId: usuarios.oficinista.id,
      vendedorId: usuarios.oficinista.id,
      fechaVenta: haceDias(2),
      boletos: [
        {
          asiento: 10,
          cedula: '1712345717',
          nombres: 'Bruno',
          apellidos: 'Cliente Demo',
          estado: 'Emitido',
        },
        {
          asiento: 11,
          cedula: '0102345675',
          nombres: 'Pedro',
          apellidos: 'Vega Demo',
          estado: 'Emitido',
        },
      ],
    },
  ]

  for (const definicion of definiciones) {
    const ruta = rutas.get(definicion.rutaKey)
    if (!ruta) {
      throw new Error(`La venta ${definicion.clave} apunta a una ruta inexistente.`)
    }
    const resultado = await crearVenta({
      ruta,
      asientosPorPlaca: asientos,
      tiposAsiento,
      definicion,
    })
    ventas.set(definicion.clave, resultado)
  }

  return ventas
}

function imprimirResumen({ ventas, rutas }) {
  const ventaPendiente = ventas.get('pendiente-transferencia')
  const ventaSinComprobante = ventas.get('pendiente-sin-comprobante')

  console.log('\n[ok] Datos demo sembrados correctamente.\n')
  console.log('Cuentas (contraseña para todas: ' + PASSWORD_DEMO + ')')
  for (const cuenta of CUENTAS_DEMO) {
    console.log(`  - ${cuenta.rol.padEnd(10)} ${cuenta.email.padEnd(34)} cédula ${cuenta.cedula}`)
  }

  console.log('\nRutas sembradas:')
  for (const definicion of RUTAS_DEMO) {
    const ruta = rutas.get(definicion.clave)
    console.log(
      `  - ${definicion.clave.padEnd(3)} ${definicion.fecha} ${definicion.horaSalida.slice(0, 5)} ` +
        `${ruta.CiudadOrigen} -> ${ruta.CiudadDestino} | ${definicion.estado} | ${definicion.placa}`,
    )
  }

  console.log('\nVentas pendientes para AprobarPago:')
  console.log(
    `  - #${ventaPendiente.venta.Id}: CON comprobante (aprobación habilitada), total $${ventaPendiente.venta.Total}`,
  )
  console.log(
    `  - #${ventaSinComprobante.venta.Id}: SIN comprobante (aprobación deshabilitada), total $${ventaSinComprobante.venta.Total}`,
  )
  console.log('\nVuelve a ejecutar `npm run seed:test` cuando quieras restaurar el escenario.')
}

// ---------------------------------------------------------------------------
// Orquestación
// ---------------------------------------------------------------------------

async function main() {
  cargarEnvLocal()
  const { url, serviceRoleKey } = requerirConfiguracion()
  supabase = crearCliente(url, serviceRoleKey)

  console.log(`\nSeed de datos de prueba contra ${url}`)

  await limpiarDatosDemo()

  console.log('[2/6] Creando cooperativa, tipos de asiento y usuarios...')
  const cooperativaId = await crearCooperativa()
  const tiposAsiento = await asegurarTiposAsiento()
  const usuarios = await crearUsuariosDemo(cooperativaId)

  console.log('[3/6] Creando buses, asientos, frecuencias y rutas...')
  const { buses, asientos } = await crearBusesYAsientos(cooperativaId)
  const frecuencias = await crearFrecuencias(cooperativaId)
  const rutas = await crearRutas({ frecuencias, buses, usuarios })

  console.log('[4/6] Subiendo comprobante de transferencia demo...')
  const comprobanteUrl = await subirComprobanteDemo()

  console.log('[5/6] Creando ventas y boletos...')
  const ventas = await crearVentasDemo({
    rutas,
    asientos,
    tiposAsiento,
    usuarios,
    comprobanteUrl,
  })

  console.log('[6/6] Verificando resultados...')
  const pendientes = validarRespuesta(
    await supabase.from('Ventas').select('Id').eq('Estado', 'Pendiente'),
    'verificar ventas pendientes',
  )
  if (!pendientes || pendientes.length < 2) {
    throw new Error('No se crearon las ventas pendientes esperadas.')
  }

  imprimirResumen({ ventas, rutas })
}

main().catch((error) => {
  console.error('\n[error] El seed no pudo completarse.')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
