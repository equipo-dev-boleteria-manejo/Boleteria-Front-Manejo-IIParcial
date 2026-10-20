import { EstadoBus } from '../Constants/EstadosSistema';

export type EstructuraBus = 'UnPiso' | 'DosPisos';

export class Bus {
  public id?: number;
  public marcaChasis?: string;
  public marcaCarroceria?: string;
  public anio?: number;
  public fotoUrl?: string;
  public estructura: EstructuraBus = 'UnPiso';
  public createdAt?: Date;

  constructor(
    public cooperativaId: number,
    public numero: string,
    public placa: string,
    public totalAsientos: number,
    public estado: EstadoBus = EstadoBus.ACTIVO,
  ) {}

  esValido(): boolean {
    return (
      Boolean(this.numero && this.numero.trim().length > 0) &&
      Boolean(this.placa && this.placa.trim().length >= 6) &&
      this.cooperativaId > 0 &&
      this.totalAsientos > 0
    );
  }

  activar(): void {
    this.estado = EstadoBus.ACTIVO;
  }

  desactivar(): void {
    this.estado = EstadoBus.INACTIVO;
  }

  marcarEnMantenimiento(): void {
    this.estado = EstadoBus.MANTENIMIENTO;
  }

  marcarFueraDeServicio(): void {
    this.estado = EstadoBus.FUERA_DE_SERVICIO;
  }

  estaDisponibleParaOperar(): boolean {
    return this.estado === EstadoBus.ACTIVO;
  }
}
