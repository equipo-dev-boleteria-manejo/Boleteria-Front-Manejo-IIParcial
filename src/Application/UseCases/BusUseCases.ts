import { Bus } from '../../Domain/Entities/Bus';
import { EstadoBus } from '../../Domain/Constants/EstadosSistema';
import { IBusRepository } from '../../Domain/Repositories/IBusRepository';
import { DomainException } from '../../Domain/Exceptions/DomainException';

export class ObtenerTodosBuses {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(): Promise<Bus[]> {
    return this.busRepository.obtenerTodos();
  }
}

export class ObtenerBusesPorCooperativa {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(cooperativaId: number): Promise<Bus[]> {
    return this.busRepository.obtenerPorCooperativa(cooperativaId);
  }
}

export class ObtenerBusesDisponibles {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(cooperativaId: number): Promise<Bus[]> {
    return this.busRepository.obtenerDisponiblesParaOperar(cooperativaId);
  }
}

export class ObtenerBusPorId {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(id: number): Promise<Bus | null> {
    return this.busRepository.obtenerPorId(id);
  }
}

export class ActualizarBus {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(id: number, bus: Partial<Bus>): Promise<Bus> {
    return this.busRepository.actualizar(id, bus);
  }
}

export class EliminarBus {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(id: number): Promise<void> {
    return this.busRepository.eliminarLogico(id);
  }
}

export class ActualizarCapacidadBus {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(busId: number, totalAsientos: number): Promise<Bus> {
    const bus = await this.busRepository.obtenerPorId(busId);

    if (!bus) {
      throw new DomainException(`Bus ${busId} no encontrado`);
    }

    return this.busRepository.actualizar(busId, { totalAsientos });
  }
}

export class DesactivarBus {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(busId: number): Promise<Bus> {
    const bus = await this.busRepository.obtenerPorId(busId);

    if (!bus) {
      throw new DomainException(`Bus ${busId} no encontrado`);
    }

    return this.busRepository.cambiarEstado(busId, EstadoBus.INACTIVO);
  }
}

export class ActivarBus {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(busId: number): Promise<Bus> {
    const bus = await this.busRepository.obtenerPorId(busId);

    if (!bus) {
      throw new DomainException(`Bus ${busId} no encontrado`);
    }

    return this.busRepository.cambiarEstado(busId, EstadoBus.ACTIVO);
  }
}