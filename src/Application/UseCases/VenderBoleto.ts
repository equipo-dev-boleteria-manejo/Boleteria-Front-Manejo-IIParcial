import type { IVentaRepository, VentaPayload } from '../../Domain/Repositories/IVentaRepository';
import type { IBoletosRepository, BoletoPayload } from '../../Domain/Repositories/IBoletosRepository';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { EstadoVenta, EstadoBoleto, TipoPasajero } from '../../Domain/Constants/EstadosSistema';
import { SupabaseVentasRepository } from '../../Infrastructure/Repositories/SupabaseVentasRepository';
import { SupabaseBoletosRepository } from '../../Infrastructure/Repositories/SupabaseBoletosRepository';

export interface PasajeroVentaInput {
  asientoId: number;
  nombres: string;
  apellidos: string;
  cedula: string;
  fechaNacimiento: string;
  esMenor: boolean;
  esDiscapacitado: boolean;
  esTerceraEdad: boolean;
  descuentoAplicado: number;
  precioFinal: number;
}

export interface VenderBoletoInput {
  usuarioVendedorId: string;
  ruta: {
    id: number;
    estado: string;
    origen: string;
    destinoFinal: string;
    esDirecto: boolean;
  };
  ciudadDestinoVenta: string;
  paradaDestinoId?: number | null;
  paradaPermiteVenta?: boolean;
  metodoPago: string;
  pasajeros: PasajeroVentaInput[];
}

export interface ResultadoVentaBoleto {
  ventaId: number;
  total: number;
  boletos: any[];
}

export class VenderBoleto {
  constructor(
    private ventaRepo: IVentaRepository = new SupabaseVentasRepository(),
    private boletosRepo: IBoletosRepository = new SupabaseBoletosRepository(),
  ) {}

  async ejecutar(input: VenderBoletoInput): Promise<ResultadoVentaBoleto> {
    if (!input.usuarioVendedorId) {
      throw new DomainException('No se encontró el usuario oficinista autenticado.', 'OFICINISTA_NO_AUTENTICADO');
    }

    if (!input.ruta?.id) {
      throw new DomainException('Debe seleccionar una ruta.', 'RUTA_NO_SELECCIONADA');
    }

    const estadoRuta = String(input.ruta.estado || '').toLowerCase();
    if (estadoRuta.includes('cancel') || estadoRuta.includes('complet')) {
      throw new DomainException('No se puede vender en una ruta cancelada o completada.', 'RUTA_ESTADO_INVALIDO');
    }

    if (!input.pasajeros?.length) {
      throw new DomainException('Debe registrar al menos un pasajero.', 'SIN_PASAJEROS');
    }

    if (input.ruta.esDirecto && input.paradaDestinoId) {
      throw new DomainException('No se permiten paradas intermedias en una frecuencia directa.', 'PARADA_NO_PERMITIDA');
    }

    if (!input.ruta.esDirecto && input.paradaDestinoId && input.paradaPermiteVenta === false) {
      throw new DomainException('La parada seleccionada no permite venta de boletos.', 'PARADA_SIN_VENTA');
    }

    for (const pasajero of input.pasajeros) {
      if (!pasajero.asientoId) {
        throw new DomainException('Debe seleccionar un asiento.', 'ASIENTO_REQUERIDO');
      }

      if (!pasajero.nombres?.trim() || !pasajero.apellidos?.trim()) {
        throw new DomainException('Debe ingresar nombres y apellidos del pasajero.', 'NOMBRES_REQUERIDOS');
      }

      if (!pasajero.cedula?.trim()) {
        throw new DomainException('Debe ingresar la cédula del pasajero.', 'CEDULA_REQUERIDA');
      }

      if (!pasajero.fechaNacimiento) {
        throw new DomainException('Debe ingresar la fecha de nacimiento del pasajero.', 'FECHA_REQUERIDA');
      }

      const disponible = await this.boletosRepo.verificarAsientoDisponible(
        input.ruta.id,
        pasajero.asientoId,
      );

      if (!disponible) {
        throw new DomainException(`El asiento ${pasajero.asientoId} ya fue vendido.`, 'ASIENTO_NO_DISPONIBLE');
      }
    }

    const total = Number(
      input.pasajeros
        .reduce((acc, pasajero) => acc + Number(pasajero.precioFinal || 0), 0)
        .toFixed(2),
    );

    const ventaPayload: VentaPayload = {
      UsuarioVendedorId: input.usuarioVendedorId,
      RutaId: input.ruta.id,
      CiudadOrigenVenta: input.ruta.origen,
      CiudadDestinoVenta: input.ciudadDestinoVenta,
      Total: total,
      Estado: EstadoVenta.APROBADA_PAGO,
      MetodoPago: input.metodoPago,
      ComprobanteUrl: null,
      AprobadoPorId: input.usuarioVendedorId,
      FechaVenta: new Date().toISOString(),
    };

    const ventaId = await this.ventaRepo.crearVenta(ventaPayload);

    const boletosPayload: BoletoPayload[] = input.pasajeros.map((pasajero) => {
      const unique = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
      const codigoQr = `QR-R${input.ruta.id}-V${ventaId}-A${pasajero.asientoId}-${unique}`;
      const codigoBarras = `BC-R${input.ruta.id}-V${ventaId}-A${pasajero.asientoId}-${unique}`;

      let tipo = TipoPasajero.GENERAL;
      if (pasajero.esDiscapacitado) {
        tipo = TipoPasajero.DISCAPACITADO;
      } else if (pasajero.esTerceraEdad) {
        tipo = TipoPasajero.TERCERA_EDAD;
      } else if (pasajero.esMenor) {
        tipo = TipoPasajero.MENOR_EDAD;
      }

      return {
        VentaId: ventaId,
        RutaId: input.ruta.id,
        AsientoId: pasajero.asientoId,
        NombresPasajero: pasajero.nombres.trim(),
        ApellidosPasajero: pasajero.apellidos.trim(),
        CedulaPasajero: pasajero.cedula.trim(),
        FechaNacimiento: pasajero.fechaNacimiento,
        EsMenor: pasajero.esMenor,
        EsDiscapacitado: pasajero.esDiscapacitado,
        EsTerceraEdad: pasajero.esTerceraEdad,
        TipoPasajero: tipo,
        DescuentoAplicado: pasajero.descuentoAplicado,
        PrecioFinal: pasajero.precioFinal,
        CodigoQr: codigoQr,
        CodigoBarras: codigoBarras,
        Estado: EstadoBoleto.EMITIDO,
        CreatedAt: new Date().toISOString(),
      };
    });

    const boletos = await this.boletosRepo.insertarBoletos(boletosPayload);

    return {
      ventaId,
      total,
      boletos,
    };
  }
}

export const venderBoletoUseCase = new VenderBoleto();
