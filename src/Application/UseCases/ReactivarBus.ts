import { Bus } from '../../Domain/Entities/Bus';
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
    const { busId, reactivadoPor } = input;

    // Obtener bus actual
    const busActual = await this.busRepository.obtenerPorId(busId);
    if (!busActual) {
      throw new BusNoEncontradoException(String(busId));
    }

    // Validar que está en estado EnMantenimiento
    if (busActual.estado !== 'EnMantenimiento') {
      throw new BusNoDisponibleParaReactivarException(
        busId,
        busActual.estado || 'desconocido'
      );
    }

    // Reactivar bus (cambiar estado a Activo)
    const busReactivado = await this.busRepository.reactivarBus(busId, reactivadoPor);

    return {
      success: true,
      busReactivado: {
        id: busActual.id,
        numero: busActual.numero,
        estado: 'Activo',
      },
      mensaje: `Bus ${busActual.numero} ha sido reactivado exitosamente y está disponible para nuevas asignaciones.`,
    };
  }
}
