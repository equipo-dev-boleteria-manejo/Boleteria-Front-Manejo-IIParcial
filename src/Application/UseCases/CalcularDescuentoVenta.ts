import { CalcularDescuentoVentaDto, ResultadoDescuentoVentaDto } from '../Dtos/CalcularDescuentoVentaDto';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { Cedula } from '../../Domain/ValueObjects/Cedula';

const PORCENTAJE_DESCUENTO_MENOR = 0.3;
const PORCENTAJE_DESCUENTO_DISCAPACIDAD = 0.5;
const PORCENTAJE_DESCUENTO_TERCERA_EDAD = 0.5;

export class CalcularDescuentoVenta {
  ejecutar(datos: CalcularDescuentoVentaDto): ResultadoDescuentoVentaDto {
    const cedula = Cedula.crear(datos.numeroCedula);
    const edad = this.validarEdad(datos.edad);
    const tieneDiscapacidad = this.validarDiscapacidad(datos.tieneDiscapacidad);
    const precioBase = this.validarPrecioBase(datos.precioBase);

    const reglas: Array<{ categoria: ResultadoDescuentoVentaDto['categoria']; porcentaje: number }> = [
      { categoria: 'SIN_DESCUENTO', porcentaje: 0 },
    ];

    if (edad < 18) {
      reglas.push({ categoria: 'MENOR', porcentaje: PORCENTAJE_DESCUENTO_MENOR });
    }

    if (tieneDiscapacidad) {
      reglas.push({ categoria: 'DISCAPACIDAD', porcentaje: PORCENTAJE_DESCUENTO_DISCAPACIDAD });
    }

    if (edad >= 65) {
      reglas.push({ categoria: 'TERCERA_EDAD', porcentaje: PORCENTAJE_DESCUENTO_TERCERA_EDAD });
    }

    const prioridad: Record<ResultadoDescuentoVentaDto['categoria'], number> = {
      SIN_DESCUENTO: 0,
      MENOR: 1,
      TERCERA_EDAD: 2,
      DISCAPACIDAD: 3,
    };

    const reglaAplicada = reglas.reduce((mejorRegla, actual) => {
      if (actual.porcentaje > mejorRegla.porcentaje) {
        return actual;
      }

      if (
        actual.porcentaje === mejorRegla.porcentaje &&
        prioridad[actual.categoria] > prioridad[mejorRegla.categoria]
      ) {
        return actual;
      }

      return mejorRegla;
    });

    const montoDescuento = this.redondear(precioBase * reglaAplicada.porcentaje);
    const precioFinal = this.redondear(precioBase - montoDescuento);

    return {
      numeroCedula: cedula.valor,
      edad,
      tieneDiscapacidad,
      precioBase: this.redondear(precioBase),
      categoria: reglaAplicada.categoria,
      porcentajeDescuento: reglaAplicada.porcentaje,
      montoDescuento,
      precioFinal,
    };
  }

  private validarEdad(edad: number): number {
    if (!Number.isFinite(edad) || !Number.isInteger(edad) || edad < 0 || edad > 120) {
      throw new DomainException('La edad debe ser un número entero válido.', 'EDAD_INVALIDA');
    }

    return edad;
  }

  private validarDiscapacidad(tieneDiscapacidad: boolean): boolean {
    if (typeof tieneDiscapacidad !== 'boolean') {
      throw new DomainException('El campo de discapacidad debe ser booleano.', 'DISCAPACIDAD_INVALIDA');
    }

    return tieneDiscapacidad;
  }

  private validarPrecioBase(precioBase: number): number {
    if (!Number.isFinite(precioBase) || precioBase <= 0) {
      throw new DomainException('El precio base debe ser mayor a 0.', 'PRECIO_INVALIDO');
    }

    return precioBase;
  }

  private redondear(valor: number): number {
    return Number(valor.toFixed(2));
  }
}
