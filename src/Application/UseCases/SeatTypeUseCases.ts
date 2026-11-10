import { ISeatTypeRepository } from '../../Domain/Repositories/ISeatTypeRepository';
import { SeatType } from '../../Domain/Entities/SeatType';
import { ValidarAsignacionAsiento } from '../../Domain/Services/ValidarAsignacionAsiento';
import { 
  PrecioNegativoException, 
  PorcentajeDescuentoInvalidoException, 
  SeatTypeNoEncontradoException 
} from '../../Domain/Exceptions/SeatTypeException';
import { 
  SeatTypeResponseDTO, 
  CalcularTarifaInputDTO, 
  ValidarAsignacionInputDTO 
} from '../Dtos/SeatTypeDTOs';

export class SeatTypeUseCases {
  constructor(private readonly seatTypeRepository: ISeatTypeRepository) {}

  /**
   * Obtiene los tipos de asientos activos mapeados con tipado fuerte de Dominio
   */
  async obtenerTiposAsiento(): Promise<SeatTypeResponseDTO[]> {
    const tipos = await this.seatTypeRepository.obtenerActivos();
    return tipos.map((t: SeatType) => ({
      id: t.id ?? 0,
      nombre: t.nombre,
      colorHex: t.colorHex,
      precioBase: t.precioBase,
      descripcion: t.descripcion ?? '',
      estado: Boolean(t.estado),
    }));
  }

  /**
   * Calcula la tarifa consultando el catálogo por ID o aplicando el precio base provisto
   */
  async calcularTarifaAsiento(input: CalcularTarifaInputDTO): Promise<number> {
    let basePrice = input.precioBase;

    // Si se envía seatTypeId, se consulta el precio base directo del catálogo
    if (input.seatTypeId !== undefined && input.seatTypeId !== null) {
      const idSearch = typeof input.seatTypeId === 'number' ? input.seatTypeId : String(input.seatTypeId);
      const seatType = await this.seatTypeRepository.obtenerPorId(idSearch as any);
      if (!seatType) {
        throw new SeatTypeNoEncontradoException(input.seatTypeId);
      }
      basePrice = seatType.precioBase;
    }

    if (basePrice === undefined || basePrice < 0) {
      throw new PrecioNegativoException();
    }

    const descuento = input.porcentajeDescuento ?? 0;
    if (descuento < 0 || descuento > 100) {
      throw new PorcentajeDescuentoInvalidoException();
    }

    return basePrice - (basePrice * descuento) / 100;
  }

  /**
   * Valida la regla de asignación de paradas intermedias vs terminal
   */
  validarAsignacionAsiento(input: ValidarAsignacionInputDTO): void {
    ValidarAsignacionAsiento.validar({
      rutaTipoDirecta: input.rutaTipoDirecta,
      paradaDestinoId: input.paradaDestinoId,
      terminalDestinoId: input.terminalDestinoId,
    });
  }
}