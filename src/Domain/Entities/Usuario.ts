/**
 * Usuario.ts - Entidad de Dominio: Cuenta de Usuario del Sistema
 *
 * Representa la identidad, perfil y rol de un actor en el sistema (cliente, chofer, oficinista, admin).
 * Entidad pura: NO realiza llamadas a base de datos, consultas ni operaciones de I/O.
 */

import { RolUsuario } from '../Constants/EstadosSistema';
import { Cedula } from '../ValueObjects/Cedula';

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Usuario {
  public id?: string;
  public cooperativaId?: number | null;
  public createdAt?: Date;

  constructor(
    public email: string,
    public cedula: Cedula,
    public nombres: string,
    public apellidos: string,
    public rol: RolUsuario = RolUsuario.CLIENTE,
    public activo: boolean = true,
  ) {}

  get nombreCompleto(): string {
    return `${this.nombres.trim()} ${this.apellidos.trim()}`.trim();
  }

  esValida(): boolean {
    const emailNorm = this.email?.trim().toLowerCase();
    const nombresNorm = this.nombres?.trim();
    const apellidosNorm = this.apellidos?.trim();

    return (
      Boolean(emailNorm && FORMATO_EMAIL.test(emailNorm)) &&
      Boolean(this.cedula && this.cedula instanceof Cedula) &&
      Boolean(nombresNorm && nombresNorm.length > 0) &&
      Boolean(apellidosNorm && apellidosNorm.length > 0) &&
      Object.values(RolUsuario).includes(this.rol) &&
      typeof this.activo === 'boolean'
    );
  }

  desactivar(): void {
    this.activo = false;
  }

  activar(): void {
    this.activo = true;
  }

  cambiarRol(nuevoRol: RolUsuario): void {
    if (!Object.values(RolUsuario).includes(nuevoRol)) {
      throw new Error(`El rol '${nuevoRol}' no es un rol válido del sistema`);
    }
    this.rol = nuevoRol;
  }

  asignarCooperativa(cooperativaId: number | null): void {
    this.cooperativaId = cooperativaId;
  }

  actualizarDatosPersonales(nombres: string, apellidos: string): void {
    const nombresNorm = nombres?.trim();
    const apellidosNorm = apellidos?.trim();

    if (!nombresNorm || !apellidosNorm) {
      throw new Error('Nombres y apellidos son requeridos para actualizar los datos personales');
    }

    this.nombres = nombresNorm;
    this.apellidos = apellidosNorm;
  }

  puedeOperarComoChofer(): boolean {
    return this.activo && this.rol === RolUsuario.CHOFER && Boolean(this.cooperativaId);
  }

  esAdministrador(): boolean {
    return this.activo && this.rol === RolUsuario.ADMIN;
  }
}
