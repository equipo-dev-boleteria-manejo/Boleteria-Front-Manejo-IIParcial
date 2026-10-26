import { Bus } from '../../Domain/Entities/Bus';
import { EstadoBus } from '../../Domain/Constants/EstadosSistema';
import { BusException, BusNoEncontradoException } from '../../Domain/Exceptions/BusException';
import { BusReemplazoNoValidoException } from '../../Domain/Exceptions/BusFueraDeServicioException';
import { IBusRepository } from '../../Domain/Repositories/IBusRepository';
import { ReportarIncidenteOperativoDto } from '../Dtos/ReportarIncidenteOperativoDto';

const MOTIVOS_VALIDOS = ['AveriaMecanica', 'Accidente', 'ReparacionProgramada', 'Otro'];

export interface ReportarIncidenteOperativoResponse {
  success: boolean;
  incidenteId?: string;
  busActualizado: {
    id: number;
    numero: string;
    estado: string;
  };
  motivo: string;
  descripcion?: string;
  acciones: {
    reemplazoPosible: boolean;
    busReemplazoSugerido?: { id: number; numero: string };
    mensaje: string;
  };
}

export class ReportarIncidenteOperativo {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(input: ReportarIncidenteOperativoDto): Promise<ReportarIncidenteOperativoResponse> {
    const { cooperativaId, busNumero, motivo, descripcion, replacementBusNumero } = input;

    // 1. Obtener bus actual
    const busActual = await this.busRepository.obtenerPorNumero(cooperativaId, busNumero.trim());
    if (!busActual) {
      throw new BusNoEncontradoException(String(busNumero));
    }

    // 2. Validar que el motivo sea válido
    if (!MOTIVOS_VALIDOS.includes(motivo)) {
      throw new BusException(
        `Motivo inválido: ${motivo}. Debe ser uno de: ${MOTIVOS_VALIDOS.join(', ')}`,
        'BUS_INCIDENT_REASON_INVALID'
      );
    }

    // 3. Validar bus de reemplazo si se proporciona
    let busReemplazo: Bus | null = null;
    if (replacementBusNumero && replacementBusNumero.trim()) {
      busReemplazo = await this.busRepository.obtenerPorNumero(cooperativaId, replacementBusNumero.trim());
      if (!busReemplazo) {
        throw new BusReemplazoNoValidoException(replacementBusNumero, 'Bus no encontrado');
      }
      if (!busReemplazo.estaDisponibleParaOperar()) {
        throw new BusReemplazoNoValidoException(replacementBusNumero, `El bus está en estado ${busReemplazo.estado}`);
      }
      if (busReemplazo.id === busActual.id) {
        throw new BusReemplazoNoValidoException(replacementBusNumero, 'No puedes usar el mismo bus como reemplazo');
      }
    }

    // 4. Sacar el bus de operación (estado Mantenimiento)
    const busActualizado = await this.busRepository.cambiarEstado(busActual.id!, EstadoBus.MANTENIMIENTO);

    const incidenteId = `INC-${busActual.id}-${Date.now()}`;

    const mensajeReemplazo = busReemplazo
      ? ` Bus de reemplazo sugerido: ${busReemplazo.numero}.`
      : ' No se indicó bus de reemplazo.';

    return {
      success: true,
      incidenteId,
      busActualizado: {
        id: busActualizado.id ?? busActual.id!,
        numero: busActualizado.numero,
        estado: busActualizado.estado,
      },
      motivo,
      descripcion,
      acciones: {
        reemplazoPosible: Boolean(busReemplazo),
        busReemplazoSugerido: busReemplazo
          ? { id: busReemplazo.id!, numero: busReemplazo.numero }
          : undefined,
        mensaje: `Bus ${busActual.numero} marcado como En mantenimiento.${mensajeReemplazo} La reasignación de rutas y pasajeros corresponde al módulo de Rutas y Ventas.`,
      },
    };
  }
}