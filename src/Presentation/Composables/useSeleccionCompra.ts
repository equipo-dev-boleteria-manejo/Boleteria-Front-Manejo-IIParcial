/**
 * useSeleccionCompra.ts - Composable Headless para el mapa de asientos y
 * captura de pasajeros de una compra.
 *
 * La carga del mapa, las tarifas y el cálculo de descuentos viven en casos de
 * uso. Este composable solo mantiene estado reactivo y transforma los datos a
 * los DTOs que consumen los flujos de compra online y venta en ventanilla.
 */

import { computed, ref } from 'vue';
import type { Asiento } from '../../Domain/Entities/Asiento';
import type { PasajeroCompraInput } from '../../Application/UseCases/ConfirmarCompra';
import type { PasajeroVentaInput } from '../../Application/UseCases/VenderBoleto';
import { ObtenerMapaAsientos } from '../../Application/UseCases/ObtenerMapaAsientos';
import { CalcularTarifaPasajero } from '../../Application/UseCases/CalcularTarifaPasajero';
import type {
  DatosPasajeroSeleccion,
  PasajeroCalculado,
} from '../../Application/Dtos/PasajeroCompraDto';

export type { DatosPasajeroSeleccion, PasajeroCalculado };

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
  obtenerMapa: ObtenerMapaAsientos = new ObtenerMapaAsientos(),
  calcularTarifa: CalcularTarifaPasajero = new CalcularTarifaPasajero(),
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
    redondear(
      asientosElegidos.value.reduce(
        (acumulado, asiento) => acumulado + precioDeAsiento(asiento),
        0,
      ),
    ),
  );

  const pasajerosCalculados = computed<PasajeroCalculado[]>(() =>
    asientosElegidos.value.map((asiento) => calcularPasajero(asiento)),
  );

  const totalConDescuentos = computed<number>(() =>
    redondear(
      pasajerosCalculados.value.reduce(
        (acumulado, pasajero) =>
          acumulado + (pasajero.valido ? pasajero.precioFinal : pasajero.precioBase),
        0,
      ),
    ),
  );

  const ahorro = computed<number>(() =>
    redondear(totalBase.value - totalConDescuentos.value),
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

  function redondear(valor: number): number {
    return Number(valor.toFixed(2));
  }

  function precioDeAsiento(asiento: Asiento): number {
    return preciosPorTipo.value[asiento.tipo] ?? tarifaBase.value;
  }

  async function cargarMapa(input: CargarMapaInput): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const resultado = await obtenerMapa.ejecutar(input);
      preciosPorTipo.value = resultado.preciosPorTipo;
      tarifaBase.value = resultado.tarifaBase;
      asientosMapa.value = resultado.asientos;
      asientosOcupados.value = resultado.ocupados;
      limpiarSeleccion();
    } catch (err: unknown) {
      error.value =
        err instanceof Error
          ? err.message
          : 'Error al cargar el mapa de asientos de la ruta.';
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
    return calcularTarifa.ejecutar({
      asiento,
      datos: obtenerDatos(asiento.id!),
      precioBase: precioDeAsiento(asiento),
    });
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
    ahorro,
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
