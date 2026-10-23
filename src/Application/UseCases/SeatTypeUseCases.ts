import { ISeatTypeRepository } from '../../Domain/Repositories/ISeatTypeRepository';
import { ValidarAsignacionAsiento } from '../../Domain/Services/ValidarAsignacionAsiento';
import { 
  SeatTypeResponseDTO, 
  CalcularTarifaInputDTO, 
  ValidarAsignacionInputDTO 
} from '../Dtos/SeatTypeDTOs';

export class SeatTypeUseCases {
  // Criterio DIP: Inyección de dependencias por constructor
  constructor(private readonly seatTypeRepository: ISeatTypeRepository) {}

  /**
   * REQUERIDO: Obtener tipos de asientos activos en formato DTO
   */
  async obtenerTiposAsiento(): Promise<SeatTypeResponseDTO[]> {
    const tipos = await this.seatTypeRepository.obtenerActivos();
    return tipos.map((t: any) => ({
      id: t.id ?? '',
      nombre: t.nombre ?? '',
      colorHex: t.colorHex ?? t.color_hex ?? '#000000',
      precioBase: t.precioBase ?? t.precio_base ?? 0,
      descripcion: t.descripcion ?? '',
      estado: Boolean(t.estado),
    }));
  }

  /**
   * REQUERIDO: Calcular tarifa con porcentaje de descuento
   */
  calcularTarifaAsiento(input: CalcularTarifaInputDTO): number {
    if (input.precioBase < 0) {
      throw new Error('El precio base no puede ser negativo');
    }
    const descuento = input.porcentajeDescuento ?? 0;
    if (descuento < 0 || descuento > 100) {
      throw new Error('El porcentaje de descuento debe estar entre 0 y 100');
    }
    return input.precioBase - (input.precioBase * descuento) / 100;
  }

  /**
   * REQUERIDO: Validar asignación de asiento según tipo de ruta
   */
  validarAsignacionAsiento(input: ValidarAsignacionInputDTO): void {
    ValidarAsignacionAsiento.validar({
      rutaTipoDirecta: input.rutaTipoDirecta,
      paradaDestinoId: input.paradaDestinoId,
      terminalDestinoId: input.terminalDestinoId,
    });
  }
}