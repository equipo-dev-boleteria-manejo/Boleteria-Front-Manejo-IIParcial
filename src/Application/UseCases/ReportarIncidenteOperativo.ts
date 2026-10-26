import { Bus } from '../../Domain/Entities/Bus';
import { Ruta } from '../../Domain/Entities/Ruta';
import { EstadoBus, EstadoRuta } from '../../Domain/Constants/EstadosSistema';
import { BusReemplazoNoValidoException } from '../../Domain/Exceptions/BusFueraDeServicioException';
import { BusNoEncontradoException } from '../../Domain/Exceptions/BusException';
import { IBusRepository } from '../../Domain/Repositories/IBusRepository';
import { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';
import { IVentaRepository } from '../../Domain/Repositories/IVentaRepository';
import { ReportarIncidenteOperativoDto } from '../Dtos/ReportarIncidenteOperativoDto';

export interface ReportarIncidenteOperativoResponse {
  success: boolean;
  incidenteId?: string;
  busActualizado: {
    id: number;
    numero: string;
    estado: string;
  };
  rutasAfectadas: number;
  acciones: {
    reemplazoPosible: boolean;
    busReemplazoSugerido?: { id: number; numero: string };
    nuevaRutaId?: number;
    requiereConfirmacion: boolean;
    mensaje: string;
  };
}

export class ReportarIncidenteOperativo {
  constructor(
    private busRepository: IBusRepository,
    private rutaRepository: IRutaRepository,
    private ventaRepository: IVentaRepository
  ) {}

  async ejecutar(input: ReportarIncidenteOperativoDto): Promise<ReportarIncidenteOperativoResponse> {
    const { cooperativaId, busNumero, motivo, descripcion, replacementBusNumero } = input;

    // 1. Obtener bus actual
    const busActual = await this.busRepository.obtenerPorNumero(cooperativaId, busNumero.trim());
    if (!busActual) {
      throw new BusNoEncontradoException(String(busNumero));
    }

    // 2. Validar que el motivo sea válido
    const motivosValidos = ['AveriaMecanica', 'Accidente', 'ReparacionProgramada', 'Otro'];
    if (!motivosValidos.includes(motivo)) {
      throw new Error(`Motivo inválido: ${motivo}. Debe ser uno de: ${motivosValidos.join(', ')}`);
    }

    // 3. Validar bus de reemplazo si se proporciona
    let busReemplazo: Bus | null = null;
    if (replacementBusNumero && replacementBusNumero.trim()) {
      busReemplazo = await this.busRepository.obtenerPorNumero(cooperativaId, replacementBusNumero.trim());
      if (!busReemplazo) {
        throw new BusReemplazoNoValidoException(replacementBusNumero, 'Bus no encontrado');
      }
      if (busReemplazo.estado === EstadoBus.MANTENIMIENTO || busReemplazo.estado === EstadoBus.INACTIVO) {
        throw new BusReemplazoNoValidoException(replacementBusNumero, `El bus está en estado ${busReemplazo.estado}`);
      }
      if (busReemplazo.id === busActual.id) {
        throw new BusReemplazoNoValidoException(replacementBusNumero, 'No puedes usar el mismo bus como reemplazo');
      }
    }

    // 4. Sacar el bus de operación (estado Mantenimiento)
    const busActualizado = await this.busRepository.cambiarEstado(busActual.id!, EstadoBus.MANTENIMIENTO);

    // 5. Gestión de Ruta "En Curso" (Transbordo)
    const rutasEnCurso = await this.rutaRepository.obtenerTodas({
      busId: busActual.id!,
      estado: EstadoRuta.EN_CURSO,
    });
    const rutaActiva = rutasEnCurso[0];
    let nuevaRutaId: number | undefined;
    let mensajeExtra = '';

    if (rutaActiva) {
      // Cancelar la ruta original y dejar registrado el incidente
      await this.rutaRepository.cambiarEstado(rutaActiva.id!, EstadoRuta.CANCELADA);
      await this.rutaRepository.actualizar(rutaActiva.id!, {
        observacionChofer: `🚨 INCIDENTE: ${motivo}. ${descripcion || ''}`.trim(),
      });

      // Si hay reemplazo, crear nueva ruta y migrar ventas
      if (busReemplazo) {
        const nuevaRuta = new Ruta(
          rutaActiva.frecuenciaId,
          busReemplazo.id!,
          rutaActiva.fecha,
          EstadoRuta.EN_CURSO, // Inicia directamente en curso
        );
        nuevaRuta.choferId = rutaActiva.choferId;
        nuevaRuta.horaSalida = rutaActiva.horaSalida;
        nuevaRuta.observacionChofer = `🔄 Transbordo desde unidad ${busActual.numero} por incidente.`;
        nuevaRuta.hojaRutaId = rutaActiva.hojaRutaId;
        nuevaRuta.esDirecta = rutaActiva.esDirecta;

        const rutaCreada = await this.rutaRepository.crear(nuevaRuta);
        nuevaRutaId = rutaCreada.id;

        // Migrar todas las ventas de la ruta vieja a la nueva
        await this.ventaRepository.migrarVentasARuta(rutaActiva.id!, rutaCreada.id!);
        mensajeExtra = ` Se ha generado un transbordo automático a la unidad ${busReemplazo.numero} y se han migrado los pasajeros.`;
      } else {
        mensajeExtra = ` El viaje en curso ha sido cancelado. Se requiere asignar una unidad de reemplazo manualmente para continuar el servicio.`;
      }
    }

    // 6. Obtener conteo de otras rutas afectadas (programadas)
    const rutasProgramadas = await this.rutaRepository.obtenerTodas({
      busId: busActual.id!,
      estado: EstadoRuta.PROGRAMADA,
    });
    const rutasAfectadas = rutasProgramadas.length;

    const incidenteId = `INC-${busActual.id}-${Date.now()}`;

    return {
      success: true,
      incidenteId,
      busActualizado: {
        id: busActualizado.id ?? busActual.id!,
        numero: busActualizado.numero,
        estado: busActualizado.estado,
      },
      rutasAfectadas,
      acciones: {
        reemplazoPosible: Boolean(busReemplazo),
        busReemplazoSugerido: busReemplazo
          ? { id: busReemplazo.id!, numero: busReemplazo.numero }
          : undefined,
        nuevaRutaId,
        requiereConfirmacion: rutasAfectadas > 0,
        mensaje: `Bus ${busActual.numero} marcado como En mantenimiento.${mensajeExtra} ${rutasAfectadas} ruta(s) futuras requieren atención.`,
      },
    };
  }
}