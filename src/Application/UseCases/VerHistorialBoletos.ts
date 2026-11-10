import type { ITicketRepository } from '../../Domain/Repositories/ITicketRepository';
import type { Boleto } from '../../Domain/Entities/Boleto';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { SupabaseBoletosRepository } from '../../Infrastructure/Repositories/SupabaseBoletosRepository';

export class VerHistorialBoletos {
  constructor(
    private ticketRepo: ITicketRepository = new SupabaseBoletosRepository(),
  ) {}

  async ejecutar(usuarioIdOrCedula: string | number): Promise<Boleto[]> {
    const cedula = String(usuarioIdOrCedula ?? '').trim();
    if (!cedula) {
      throw new DomainException('Identificador de usuario o cédula requerido.', 'IDENTIFICADOR_REQUERIDO');
    }

    return await this.ticketRepo.obtenerBoletosPorUsuario(cedula);
  }
}

export const verHistorialBoletosUseCase = new VerHistorialBoletos();
