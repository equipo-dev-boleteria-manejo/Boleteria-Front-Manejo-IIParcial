/**
 * useSeleccionCompra.ts - Composable Headless para el mapa de asientos y
 * captura de pasajeros de una compra.
 *
 * Centraliza la carga del mapa del bus, la disponibilidad real de la ruta, el
 * cálculo de tarifas por pasajero y la transformación a los DTOs que consumen
 * los casos de uso de compra online y venta en ventanilla.
 */

import { computed, ref } from 'vue';
import type { Asiento } from '../../Domain/Entities/Asiento';
import type { IAsientoRepository } from '../../Domain/Repositories/IAsientoRepository';
import type { IBoletosRepository } from '../../Domain/Repositories/IBoletosRepository';
import type { ISeatTypeRepository } from '../../Domain/Repositories/ISeatTypeRepository';
import type { PasajeroCompraInput } from '../../Application/UseCases/ConfirmarCompra';
import type { PasajeroVentaInput } from '../../Application/UseCases/VenderBoleto';
import { TipoPasajero } from '../../Domain/Constants/EstadosSistema';
import { calcularEdad } from '../../Domain/Services/DescuentoService';
import { CalcularDescuentoVenta } from '../../Application/UseCases/CalcularDescuentoVenta';
import { SupabaseAsientoRepository } from '../../Infrastructure/Repositories/SupabaseAsientoRepository';
import { SupabaseBoletosRepository } from '../../Infrastructure/Repositories/SupabaseBoletosRepository';
import { SupabaseSeatTypeRepository } from '../../Infrastructure/Repositories/SupabaseSeatTypeRepository';

export interface DatosPasajeroSeleccion {
  nombres: string;
  apellidos: string;
  cedula: string;
  fechaNacimiento: string;
  tieneDiscapacidad: boolean;
}

export interface PasajeroCalculado extends DatosPasajeroSeleccion {
  asientoId: number;
  asientoNumero: string;
  precioBase: number;
  precioFinal: number;
  descuentoAplicado: number;
  esMenor: boolean;
  esDiscapacitado: boolean;
  esTerceraEdad: boolean;
  tipoPasajero: TipoPasajero;
  valido: boolean;
  error: string | null;
}

export interface CargarMapaInput {
  rutaId: number;
  busId: number;
  totalAsientos: number;
  estructura?: string;
  tarifaBase?: number;
}

const DATOS_VACIOS: DatosPasajeroSeleccion = {
  nombres: '',
  apellidos: '',
  cedula: '',
  fechaNacimiento: '',
  tieneDiscapacidad: false,
};

export function useSeleccionCompra(
  asientoRepo: IAsientoRepository = new SupabaseAsientoRepository(),
  boletosRepo: IBoletosRepository = new SupabaseBoletosRepository(),
  seatTypeRepo: ISeatTypeRepository = new SupabaseSeatTypeRepository(),
  calcularDescuentoUseCase: CalcularDescuentoVenta = new CalcularDescuentoVenta(),
) {
  const asientosMapa = ref<Asiento[]>([]);
  const asientosOcupados = ref<number[]>([]);
  const asientosSeleccionados = ref<number[]>([]);
  const datosPasajeros = ref<Record<number, DatosPasajeroSeleccion>>({});
  const preciosPorTipo = ref<Record<string, number>>({});
  const tarifaBase = ref<number>(10);
  const maxSeleccion = ref<number>(10);
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);

  const asientosDisponibles = computed<Asiento[]>(() =>
    asientosMapa.value.filter(
      (asiento) =>
        asiento.disponible &&
        asiento.id !== undefined &&
        !asientosOcupados.value.includes(asiento.id),
    ),
  );

  const asientosElegidos = computed<Asiento[]>(() =>
    asientosMapa.value.filter(
      (asiento) =>
        asiento.id !== undefined &&
        asientosSeleccionados.value.includes(asiento.id),
    ),
  );

  const cantidadSeleccionada = computed<number>(
    () => asientosSeleccionados.value.length,
  );

  const totalBase = computed<number>(() =>
    thisRedondear(
      asientosElegidos.value.reduce(
        (acumulado, asiento) => acumulado + precioDeAsiento(asiento),
        0,
      ),
    ),
  );

  const pasajerosCalculados = computed<PasajeroCalculado[]>(() =>
    asientosElegidos.value.map((asiento) =>
      calcularPasajero(asiento),
    ),
  );

  const totalConDescuentos = computed<number>(() =>
    thisRedondear(
      pasajerosCalculados.value.reduce(
        (acumulado, pasajero) =>
          acumulado + (pasajero.valido ? pasajero.precioFinal : pasajero.precioBase),
        0,
      ),
    ),
  );

  const cedulasDuplicadas = computed<string[]>(() => {
    const conteo = new Map<string, number>();
    pasajerosCalculados.value.forEach((pasajero) => {
      const cedula = pasajero.cedula.trim();
      if (!cedula) return;
      conteo.set(cedula, (conteo.get(cedula) ?? 0) + 1);
    });
    return Array.from(conteo.entries())
      .filter(([, cantidad]) => cantidad > 1)
      .map(([cedula]) => cedula);
  });

  const hayCedulasDuplicadas = computed<boolean>(
    () => cedulasDuplicadas.value.length > 0,
  );

  const pasajerosValidos = computed<boolean>(
    () =>
      cantidadSeleccionada.value > 0 &&
      pasajerosCalculados.value.every((pasajero) => pasajero.valido) &&
      !hayCedulasDuplicadas.value,
  );

  function thisRedondear(valor: number): number {
    return Number(valor.toFixed(2));
  }

  function precioDeAsiento(asiento: Asiento): number {
    return preciosPorTipo.value[asiento.tipo] ?? tarifaBase.value;
  }

  async function cargarMapa(input: CargarMapaInput): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const [tiposAsiento, asientos, ocupados] = await Promise.all([
        seatTypeRepo.obtenerActivos(),
        asientoRepo.asegurarAsientosDeBus(
          input.busId,
          input.totalAsientos,
          input.estructura,
        ),
        boletosRepo.obtenerAsientosOcupadosPorRuta(input.rutaId),
      ]);

      preciosPorTipo.value = tiposAsiento.reduce<Record<string, number>>(
        (mapa, tipo) => {
          mapa[tipo.nombre] = tipo.precioBase;
          return mapa;
        },
        {},
      );

      const precios = Object.values(preciosPorTipo.value);
      tarifaBase.value =
        input.tarifaBase && input.tarifaBase > 0
          ? input.tarifaBase
          : precios.length
            ? Math.min(...precios)
            : 10;

      asientosMapa.value = asientos;
      asientosOcupados.value = ocupados;
      limpiarSeleccion();
    } catch (err: any) {
      error.value =
        err?.message || 'Error al cargar el mapa de asientos de la ruta.';
      asientosMapa.value = [];
      asientosOcupados.value = [];
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function estaOcupado(asiento: Asiento): boolean {
    return (
      asiento.id !== undefined &&
      asientosOcupados.value.includes(asiento.id)
    );
  }

  function estaSeleccionado(asiento: Asiento): boolean {
    return (
      asiento.id !== undefined &&
      asientosSeleccionados.value.includes(asiento.id)
    );
  }

  function alternarAsiento(asiento: Asiento): boolean {
    if (!asiento.id || !asiento.disponible || estaOcupado(asiento)) {
      return false;
    }

    if (estaSeleccionado(asiento)) {
      asientosSeleccionados.value = asientosSeleccionados.value.filter(
        (id) => id !== asiento.id,
      );
      const copia = { ...datosPasajeros.value };
      delete copia[asiento.id];
      datosPasajeros.value = copia;
      return true;
    }

    if (asientosSeleccionados.value.length >= maxSeleccion.value) {
      error.value = `Puedes seleccionar hasta ${maxSeleccion.value} asientos por compra.`;
      return false;
    }

    asientosSeleccionados.value = [
      ...asientosSeleccionados.value,
      asiento.id,
    ];
    datosPasajeros.value = {
      ...datosPasajeros.value,
      [asiento.id]: { ...DATOS_VACIOS },
    };
    error.value = null;
    return true;
  }

  function actualizarDatos(
    asientoId: number,
    cambios: Partial<DatosPasajeroSeleccion>,
  ): void {
    const actuales = datosPasajeros.value[asientoId] ?? { ...DATOS_VACIOS };
    datosPasajeros.value = {
      ...datosPasajeros.value,
      [asientoId]: { ...actuales, ...cambios },
    };
  }

  function obtenerDatos(asientoId: number): DatosPasajeroSeleccion {
    return datosPasajeros.value[asientoId] ?? { ...DATOS_VACIOS };
  }

  function limpiarSeleccion(): void {
    asientosSeleccionados.value = [];
    datosPasajeros.value = {};
    error.value = null;
  }

  function limpiarMapa(): void {
    limpiarSeleccion();
    asientosMapa.value = [];
    asientosOcupados.value = [];
    preciosPorTipo.value = {};
  }

  function calcularPasajero(asiento: Asiento): PasajeroCalculado {
    const datos = obtenerDatos(asiento.id!);
    const precioBase = precioDeAsiento(asiento);
    const base: PasajeroCalculado = {
      ...datos,
      asientoId: asiento.id!,
      asientoNumero: asiento.numeroAsiento,
      precioBase,
      precioFinal: precioBase,
      descuentoAplicado: 0,
      esMenor: false,
      esDiscapacitado: false,
      esTerceraEdad: false,
      tipoPasajero: TipoPasajero.GENERAL,
      valido: false,
      error: null,
    };

    if (
      !datos.nombres.trim() ||
      !datos.apellidos.trim() ||
      !datos.cedula.trim() ||
      !datos.fechaNacimiento
    ) {
      return {
        ...base,
        error: 'Completa nombres, apellidos, cédula y fecha de nacimiento.',
      };
    }

    const edad = calcularEdad(datos.fechaNacimiento);
    if (edad < 0) {
      return { ...base, error: 'La fecha de nacimiento no es válida.' };
    }

    try {
      const resultado = calcularDescuentoUseCase.ejecutar({
        numeroCedula: datos.cedula.trim(),
        edad,
        tieneDiscapacidad: datos.tieneDiscapacidad,
        precioBase,
      });

      const esDiscapacitado = resultado.categoria === 'DISCAPACIDAD';
      const esTerceraEdad = resultado.categoria === 'TERCERA_EDAD';
      const esMenor = resultado.categoria === 'MENOR';

      let tipoPasajero: TipoPasajero = TipoPasajero.GENERAL;
      if (esDiscapacitado) tipoPasajero = TipoPasajero.DISCAPACITADO;
      else if (esTerceraEdad) tipoPasajero = TipoPasajero.TERCERA_EDAD;
      else if (esMenor) tipoPasajero = TipoPasajero.MENOR_EDAD;

      return {
        ...base,
        precioFinal: resultado.precioFinal,
        descuentoAplicado: resultado.porcentajeDescuento,
        esMenor,
        esDiscapacitado,
        esTerceraEdad,
        tipoPasajero,
        valido: true,
        error: null,
      };
    } catch (err: any) {
      return {
        ...base,
        error: limpiarMensajeError(err?.message || 'Datos del pasajero inválidos.'),
      };
    }
  }

  function limpiarMensajeError(mensaje: string): string {
    return mensaje.replace(/^\[[^\]]+\]\s*/, '');
  }

  function pasajerosParaConfirmar(): PasajeroCompraInput[] {
    return pasajerosCalculados.value.map((pasajero) => ({
      asientoId: pasajero.asientoId,
      nombres: pasajero.nombres,
      apellidos: pasajero.apellidos,
      cedula: pasajero.cedula,
      fechaNacimiento: pasajero.fechaNacimiento,
      tieneDiscapacidad: pasajero.tieneDiscapacidad,
      precioUnitario: pasajero.precioBase,
    }));
  }

  function pasajerosParaVentanilla(): PasajeroVentaInput[] {
    return pasajerosCalculados.value.map((pasajero) => ({
      asientoId: pasajero.asientoId,
      nombres: pasajero.nombres,
      apellidos: pasajero.apellidos,
      cedula: pasajero.cedula,
      fechaNacimiento: pasajero.fechaNacimiento,
      esMenor: pasajero.esMenor,
      esDiscapacitado: pasajero.esDiscapacitado,
      esTerceraEdad: pasajero.esTerceraEdad,
      descuentoAplicado: pasajero.descuentoAplicado,
      precioFinal: pasajero.valido ? pasajero.precioFinal : pasajero.precioBase,
    }));
  }

  return {
    asientosMapa,
    asientosOcupados,
    asientosSeleccionados,
    asientosDisponibles,
    asientosElegidos,
    datosPasajeros,
    preciosPorTipo,
    tarifaBase,
    maxSeleccion,
    loading,
    error,
    cantidadSeleccionada,
    totalBase,
    totalConDescuentos,
    pasajerosCalculados,
    pasajerosValidos,
    cedulasDuplicadas,
    hayCedulasDuplicadas,
    cargarMapa,
    estaOcupado,
    estaSeleccionado,
    alternarAsiento,
    actualizarDatos,
    obtenerDatos,
    precioDeAsiento,
    limpiarSeleccion,
    limpiarMapa,
    pasajerosParaConfirmar,
    pasajerosParaVentanilla,
  };
}
