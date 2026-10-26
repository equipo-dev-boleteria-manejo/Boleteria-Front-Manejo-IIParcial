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
  mensaje: string;
}

export class ReactivarBus {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(input: ReactivarBusDto): Promise<ReactivarBusResponse> {
    const { busId } = input;

    // Obtener bus actual
    const busActual = await this.busRepository.obtenerPorId(busId);
    if (!busActual) {
      throw new BusNoEncontradoException(String(busId));
    }

    // Validar que está en estado Mantenimiento
    if (busActual.estado !== EstadoBus.MANTENIMIENTO) {
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
      mensaje: `Bus ${busReactivado.numero} ha sido reactivado exitosamente y está disponible para nuevas asignaciones.`,
    };
  }
}