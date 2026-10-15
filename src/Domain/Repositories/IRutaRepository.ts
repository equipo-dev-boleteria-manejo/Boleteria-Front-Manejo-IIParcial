import { Ruta } from '../Entities/Ruta';

export interface IRutaRepository {
  obtenerTodas(): Promise<Ruta[]>;
  obtenerPorId(id: string): Promise<Ruta | null>;
  crear(ruta: Ruta): Promise<Ruta>;
  actualizar(id: string, ruta: Partial<Ruta>): Promise<boolean>;
  eliminar(id: string): Promise<boolean>;
}
