import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseBoletosRepository } from './SupabaseBoletosRepository';
import { supabase } from '../Api/supabaseClient';
import { EstadoBoleto } from '../../Domain/Constants/EstadosSistema';
import { BoletoNoValidoParaRutaException } from '../../Domain/Exceptions/RutaException';

vi.mock('../Api/supabaseClient', () => ({ supabase: { from: vi.fn() } }));

type Respuesta = { data: unknown; error: { message: string } | null };

/** Construye la cadena de PostgREST y registra cada llamada para poder comprobarla. */
function simularCadena(respuestas: Respuesta[]) {
  const llamadas: Array<[string, unknown[]]> = [];
  let indice = 0;
  const cadena: Record<string, unknown> = {};

  for (const metodo of ['select', 'eq', 'in', 'limit', 'update']) {
    cadena[metodo] = vi.fn((...args: unknown[]) => {
      llamadas.push([metodo, args]);
      // Los métodos que cierran la consulta devuelven la respuesta; el resto sigue encadenando.
      if (metodo === 'select' && llamadas.some(([m]) => m === 'update')) {
        return Promise.resolve(respuestas[indice++]);
      }
      return cadena;
    });
  }
  cadena.maybeSingle = vi.fn(() => {
    llamadas.push(['maybeSingle', []]);
    return Promise.resolve(respuestas[indice++]);
  });

  vi.mocked(supabase.from).mockReturnValue(cadena as never);
  return llamadas;
}

const fila = (extras: Record<string, unknown> = {}) => ({
  Id: 99,
  VentaId: 5,
  RutaId: 1,
  AsientoId: 12,
  CedulaPasajero: '0926687856',
  NombresPasajero: 'Ana',
  ApellidosPasajero: 'Pérez',
  TipoPasajero: 'General',
  Estado: 'Emitido',
  CodigoQr: 'BOL-QR-99',
  CodigoBarras: null,
  PrecioFinal: 10,
  SubRutaOrigen: null,
  SubRutaDestino: null,
  CreatedAt: null,
  ...extras,
});

describe('SupabaseBoletosRepository - abordaje', () => {
  let repo: SupabaseBoletosRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new SupabaseBoletosRepository();
  });

  describe('obtenerPorCodigo', () => {
    it('devuelve el boleto encontrado por su código QR', async () => {
      const llamadas = simularCadena([{ data: fila(), error: null }]);

      const boleto = await repo.obtenerPorCodigo('  BOL-QR-99 ');

      expect(boleto).toMatchObject({ id: 99, rutaId: 1, estado: EstadoBoleto.EMITIDO, codigoQr: 'BOL-QR-99' });
      expect(llamadas).toContainEqual(['eq', ['CodigoQr', 'BOL-QR-99']]);
      expect(llamadas.filter(([metodo]) => metodo === 'maybeSingle')).toHaveLength(1);
    });

    it('si no hay coincidencia por QR, busca por código de barras', async () => {
      const llamadas = simularCadena([
        { data: null, error: null },
        { data: fila({ CodigoQr: null, CodigoBarras: '7501234' }), error: null },
      ]);

      const boleto = await repo.obtenerPorCodigo('7501234');

      expect(boleto?.codigoBarras).toBe('7501234');
      expect(llamadas).toContainEqual(['eq', ['CodigoQr', '7501234']]);
      expect(llamadas).toContainEqual(['eq', ['CodigoBarras', '7501234']]);
    });

    it('devuelve null si el código no existe en ninguna de las dos columnas', async () => {
      simularCadena([
        { data: null, error: null },
        { data: null, error: null },
      ]);

      expect(await repo.obtenerPorCodigo('NO-EXISTE')).toBeNull();
    });

    it('un código vacío no consulta la base de datos', async () => {
      expect(await repo.obtenerPorCodigo('   ')).toBeNull();
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('un código con comas o paréntesis se compara tal cual, sin alterar el filtro', async () => {
      const llamadas = simularCadena([
        { data: null, error: null },
        { data: null, error: null },
      ]);

      await repo.obtenerPorCodigo('a,Estado.eq.Emitido)');

      expect(llamadas).toContainEqual(['eq', ['CodigoQr', 'a,Estado.eq.Emitido)']]);
      expect(llamadas.some(([metodo]) => metodo === 'or')).toBe(false);
    });

    it('si Supabase devuelve un error lo informa', async () => {
      simularCadena([{ data: null, error: { message: 'timeout' } }]);

      await expect(repo.obtenerPorCodigo('BOL-1')).rejects.toThrow('Error al buscar el boleto por código: timeout');
    });
  });

  describe('marcarAbordado', () => {
    it('actualiza el estado a Abordado solo si el boleto sigue Emitido o Aprobado', async () => {
      const llamadas = simularCadena([{ data: [{ Id: 99 }], error: null }]);

      await expect(repo.marcarAbordado(99)).resolves.toBeUndefined();

      expect(llamadas).toContainEqual(['update', [{ Estado: 'Abordado' }]]);
      expect(llamadas).toContainEqual(['eq', ['Id', 99]]);
      expect(llamadas).toContainEqual(['in', ['Estado', ['Emitido', 'Aprobado']]]);
    });

    it('si ninguna fila cambia (ya abordó en otro dispositivo o no está habilitado) lo rechaza', async () => {
      simularCadena([{ data: [], error: null }]);

      await expect(repo.marcarAbordado(99)).rejects.toThrow(BoletoNoValidoParaRutaException);
    });

    it('si Supabase no devuelve datos tampoco lo da por válido', async () => {
      simularCadena([{ data: null, error: null }]);

      await expect(repo.marcarAbordado(99)).rejects.toThrow('ya fue utilizado');
    });

    it('si Supabase devuelve un error lo informa', async () => {
      simularCadena([{ data: null, error: { message: 'sin conexión' } }]);

      await expect(repo.marcarAbordado(99)).rejects.toThrow('Error al registrar el abordaje del boleto 99: sin conexión');
    });
  });
});
