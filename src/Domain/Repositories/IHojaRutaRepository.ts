import { HojaRuta } from '../Entities/HojaRuta';

export interface IHojaRutaRepository {
  obtenerTodas(): Promise<HojaRuta[]>;
  obtenerPorId(id: string): Promise<HojaRuta | null>;
  crear(hojaRuta: HojaRuta): Promise<HojaRuta>;
  actualizar(id: string, hojaRuta: Partial<HojaRuta>): Promise<boolean>;
  eliminar(id: string): Promise<boolean>;
}
