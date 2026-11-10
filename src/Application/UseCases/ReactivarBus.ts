import { EstadoBus } from '../../Domain/Constants/EstadosSistema';
import { BusNoDisponibleParaReactivarException } from '../../Domain/Exceptions/BusFueraDeServicioException';
import { BusNoEncontradoException } from '../../Domain/Exceptions/BusException';
import { IBusRepository } from '../../Domain/Repositories/IBusRepository';
import { ReactivarBusDto } from '../Dtos/ReactivarBusDto';

export interface ReactivarBusResponse {
  success: boolean;
  busReactivado: {
    id: number;
    numero: string;
    estado: string;
  };
  reactivadoPor: string;
  motivo?: string;
  mensaje: string;
}

const ESTADOS_REACTIVABLES: EstadoBus[] = [EstadoBus.MANTENIMIENTO, EstadoBus.INACTIVO];

export class ReactivarBus {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(input: ReactivarBusDto): Promise<ReactivarBusResponse> {
    const { busId, reactivadoPor, motivo } = input;

    // Obtener bus actual
    const busActual = await this.busRepository.obtenerPorId(busId);
    if (!busActual) {
      throw new BusNoEncontradoException(String(busId));
    }

    // Validar que está en un estado desde el cual se puede reactivar
    if (!ESTADOS_REACTIVABLES.includes(busActual.estado)) {
      throw new BusNoDisponibleParaReactivarException(
        busId,
        busActual.estado || 'desconocido'
      );
    }

    // Reactivar bus (cambiar estado a Activo)
    const busReactivado = await this.busRepository.cambiarEstado(busId, EstadoBus.ACTIVO);

    return {
      success: true,
      busReactivado: {
        id: busReactivado.id ?? busId,
        numero: busReactivado.numero,
        estado: busReactivado.estado,
      },
      reactivadoPor,
      motivo,
      mensaje: `Bus ${busReactivado.numero} ha sido reactivado exitosamente y está disponible para nuevas asignaciones.`,
    };
  }
}