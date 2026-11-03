/**
 * SupabaseAsientoRepository.ts - Implementación de IAsientoRepository con Supabase
 * Alineado estrictamente con la tabla "Asientos" del esquema oficial.
 */

import { supabase } from '../Api/supabaseClient';
import { Asiento } from '../../Domain/Entities/Asiento';
import type { IAsientoRepository } from '../../Domain/Repositories/IAsientoRepository';
import { AsientoException } from '../../Domain/Exceptions/AsientoException';

interface AsientoRow {
  Id: number;
  BusId: number;
  NumeroAsiento: string;
  Tipo: string | null;
  Fila: string | null;
  Columna: string | null;
  Piso: number | null;
  Disponible: boolean | null;
}

const COLUMNAS_POR_DEFECTO = ['A', 'B', 'C', 'D'];

export class SupabaseAsientoRepository implements IAsientoRepository {
  private readonly TABLA_ASIENTOS = 'Asientos';

  async obtenerPorBus(busId: number): Promise<Asiento[]> {
    const { data, error } = await supabase
      .from(this.TABLA_ASIENTOS)
      .select('*')
      .eq('BusId', busId)
      .order('Piso', { ascending: true })
      .order('Id', { ascending: true });

    if (error) {
      throw new AsientoException(
        `Error al obtener asientos del bus ${busId}: ${error.message}`,
      );
    }

    return ((data ?? []) as AsientoRow[])
      .map((fila) => this.mapearAsiento(fila))
      .sort((a, b) => this.compararAsientos(a, b));
  }

  async obtenerPorId(id: number): Promise<Asiento | null> {
    const { data, error } = await supabase
      .from(this.TABLA_ASIENTOS)
      .select('*')
      .eq('Id', id)
      .maybeSingle();

    if (error) {
      throw new AsientoException(
        `Error al consultar el asiento ${id}: ${error.message}`,
      );
    }

    return data ? this.mapearAsiento(data as AsientoRow) : null;
  }

  async crear(asiento: Asiento): Promise<Asiento> {
    if (!asiento.esValido()) {
      throw new AsientoException('El asiento contiene datos inválidos.');
    }

    const { data, error } = await supabase
      .from(this.TABLA_ASIENTOS)
      .insert([this.mapearAsientoAFila(asiento)])
      .select()
      .single();

    if (error) {
      throw new AsientoException(
        `Error al crear el asiento ${asiento.numeroAsiento}: ${error.message}`,
      );
    }

    return this.mapearAsiento(data as AsientoRow);
  }

  async crearMasivo(asientos: Asiento[]): Promise<Asiento[]> {
    if (!asientos.length) return [];

    const invalido = asientos.find((asiento) => !asiento.esValido());
    if (invalido) {
      throw new AsientoException(
        `El asiento ${invalido.numeroAsiento || '(sin número)'} contiene datos inválidos.`,
      );
    }

    const { data, error } = await supabase
      .from(this.TABLA_ASIENTOS)
      .insert(asientos.map((asiento) => this.mapearAsientoAFila(asiento)))
      .select('*');

    if (error) {
      throw new AsientoException(
        `Error al crear los asientos del bus ${asientos[0].busId}: ${error.message}`,
      );
    }

    return ((data ?? []) as AsientoRow[])
      .map((fila) => this.mapearAsiento(fila))
      .sort((a, b) => this.compararAsientos(a, b));
  }

  async actualizarDisponibilidad(
    id: number,
    disponible: boolean,
  ): Promise<void> {
    const { error } = await supabase
      .from(this.TABLA_ASIENTOS)
      .update({ Disponible: disponible })
      .eq('Id', id);

    if (error) {
      throw new AsientoException(
        `Error al actualizar la disponibilidad del asiento ${id}: ${error.message}`,
      );
    }
  }

  async asegurarAsientosDeBus(
    busId: number,
    totalAsientos: number,
    estructura: string = 'UnPiso',
  ): Promise<Asiento[]> {
    const existentes = await this.obtenerPorBus(busId);
    if (existentes.length > 0) return existentes;

    if (!Number.isInteger(totalAsientos) || totalAsientos <= 0) {
      throw new AsientoException(
        'La capacidad del bus debe ser mayor a cero para generar sus asientos.',
      );
    }

    const asientos = this.generarDisenoPorDefecto(
      busId,
      totalAsientos,
      estructura,
    );

    try {
      return await this.crearMasivo(asientos);
    } catch (error) {
      // Otra pestaña/petición pudo crear el mapa al mismo tiempo.
      const reintento = await this.obtenerPorBus(busId);
      if (reintento.length > 0) return reintento;
      throw error;
    }
  }

  /**
   * Genera una distribución 2+2 estándar. Los buses de dos pisos dividen la
   * capacidad en partes iguales entre ambos pisos.
   */
  private generarDisenoPorDefecto(
    busId: number,
    totalAsientos: number,
    estructura: string,
  ): Asiento[] {
    const pisos = estructura === 'DosPisos' ? 2 : 1;
    const asientosPorPiso = Math.ceil(totalAsientos / pisos);
    const resultado: Asiento[] = [];
    let numero = 1;

    for (let piso = 1; piso <= pisos && numero <= totalAsientos; piso++) {
      const restantes = totalAsientos - (numero - 1);
      const capacidadPiso = Math.min(asientosPorPiso, restantes);

      for (let indice = 0; indice < capacidadPiso; indice++) {
        const fila = Math.floor(indice / COLUMNAS_POR_DEFECTO.length) + 1;
        const columna =
          COLUMNAS_POR_DEFECTO[indice % COLUMNAS_POR_DEFECTO.length];

        resultado.push(
          new Asiento(
            busId,
            String(numero),
            'Normal',
            String(fila),
            columna,
            piso,
            true,
          ),
        );
        numero++;
      }
    }

    return resultado;
  }

  private mapearAsiento(fila: AsientoRow): Asiento {
    const asiento = new Asiento(
      fila.BusId,
      String(fila.NumeroAsiento),
      fila.Tipo ?? 'Normal',
      fila.Fila ?? '',
      fila.Columna ?? '',
      fila.Piso ?? 1,
      fila.Disponible ?? true,
    );
    asiento.id = fila.Id;
    return asiento;
  }

  private mapearAsientoAFila(asiento: Asiento) {
    return {
      BusId: asiento.busId,
      NumeroAsiento: asiento.numeroAsiento.trim(),
      Tipo: asiento.tipo.trim(),
      Fila: asiento.fila || null,
      Columna: asiento.columna || null,
      Piso: asiento.piso,
      Disponible: asiento.disponible,
    };
  }

  private compararAsientos(a: Asiento, b: Asiento): number {
    if (a.piso !== b.piso) return a.piso - b.piso;

    const filaA = Number(a.fila);
    const filaB = Number(b.fila);
    if (Number.isFinite(filaA) && Number.isFinite(filaB) && filaA !== filaB) {
      return filaA - filaB;
    }
    if (a.fila !== b.fila) return a.fila.localeCompare(b.fila);
    if (a.columna !== b.columna) return a.columna.localeCompare(b.columna);

    const numeroA = Number(a.numeroAsiento);
    const numeroB = Number(b.numeroAsiento);
    if (Number.isFinite(numeroA) && Number.isFinite(numeroB)) {
      return numeroA - numeroB;
    }
    return a.numeroAsiento.localeCompare(b.numeroAsiento);
  }
}
