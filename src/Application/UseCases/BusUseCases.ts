import { Bus, BusAsiento } from '../../Domain/Entities/Bus';
import { IBusRepository, BusFiltros } from '../../Domain/Repositories/IBusRepository';
import { DomainException } from '../../Domain/Exceptions/DomainException';

export interface CrearBusInput {
  cooperativaId: number;
  numero: string;
  placa: string;
  totalAsientos: number;
  marcaChasis?: string;
  marcaCarroceria?: string;
  anio?: number;
  fotoUrl?: string;
}

export class CrearBus {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(input: CrearBusInput): Promise<Bus> {
    const nuevoBus = new Bus(
      input.cooperativaId,
      input.numero,
      input.placa,
      input.totalAsientos
    );

    if (!nuevoBus.esValido()) {
      throw new DomainException('Los datos del autobús no son válidos. Verifique el número, la placa y la capacidad.');
    }

    const busExistente = await this.busRepository.obtenerPorPlaca(input.placa);
    if (busExistente) {
      throw new DomainException(`Ya existe un autobús registrado con la placa ${input.placa}.`);
    }

    if (input.marcaChasis) nuevoBus.marcaChasis = input.marcaChasis;
    if (input.marcaCarroceria) nuevoBus.marcaCarroceria = input.marcaCarroceria;
    if (input.anio) nuevoBus.anio = input.anio;
    if (input.fotoUrl) nuevoBus.fotoUrl = input.fotoUrl;

    return this.busRepository.crear(nuevoBus);
  }
}

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

export class ObtenerAsientosDisponibles {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(busId: number, tipo: 'NORMAL' | 'VIP'): Promise<BusAsiento[]> {
    return this.busRepository.obtenerAsientosDisponibles(busId, tipo);
  }
}

export class ReservarAsientos {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(asientos: BusAsiento[], pasajeroId: string): Promise<void> {
    asientos.forEach((a) => a.ocupar(pasajeroId));
    return this.busRepository.reservarAsientos(asientos);
  }
}

export class LiberarAsientos {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(asientos: BusAsiento[]): Promise<void> {
    asientos.forEach((a) => a.liberar());
    return this.busRepository.liberarAsientos(asientos);
  }
}

export class BuscarBusesDisponibles {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(
    ciudadOrigen: string,
    ciudadDestino: string,
    fecha: Date,
    filtros?: BusFiltros
  ): Promise<Bus[]> {
    return this.busRepository.buscarDisponibles(ciudadOrigen, ciudadDestino, fecha, filtros);
  }
}

export class ObtenerAsientosBus {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(busId: number): Promise<BusAsiento[]> {
    return this.busRepository.obtenerAsientos(busId);
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

    return this.busRepository.actualizar(busId, { estado: 'Inactivo' });
  }
}

export class ActivarBus {
  constructor(private busRepository: IBusRepository) {}

  async ejecutar(busId: number): Promise<Bus> {
    const bus = await this.busRepository.obtenerPorId(busId);

    if (!bus) {
      throw new DomainException(`Bus ${busId} no encontrado`);
    }

    return this.busRepository.actualizar(busId, { estado: 'Activo' });
  }
}