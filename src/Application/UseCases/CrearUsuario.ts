/**
 * CrearUsuario.ts - Caso de Uso para Creación Administrativa de Usuarios
 *
 * Utilizado por administradores para dar de alta usuarios con roles específicos
 * y credenciales de acceso iniciales en el proveedor de identidad.
 * Registra auditoría automática de creación de usuarios.
 */

import type { IUsuarioRepository } from '../../Domain/Repositories/IUsuarioRepository';
import type { IAuthRepository } from '../../Domain/Repositories/IAuthRepository';
import type { IAuditRepository } from '../../Domain/Repositories/IAuditRepository';
import { Usuario } from '../../Domain/Entities/Usuario';
import { Cedula } from '../../Domain/ValueObjects/Cedula';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { UsuarioException } from '../../Domain/Exceptions/UsuarioException';
import { SupabaseUsuarioRepository } from '../../Infrastructure/Repositories/SupabaseUsuarioRepository';
import { SupabaseAuthRepository } from '../../Infrastructure/Repositories/SupabaseAuthRepository';
import { SupabaseAuditRepository } from '../../Infrastructure/Repositories/SupabaseAuditRepository';
import type { CrearUsuarioDto } from '../Dtos/UsuarioDto';

export class CrearUsuario {
  constructor(
    private readonly usuarioRepo: IUsuarioRepository,
    private readonly authRepo?: IAuthRepository,
    private readonly auditRepo?: IAuditRepository
  ) {}

  async execute(dto: CrearUsuarioDto): Promise<Usuario> {
    const emailNormalizado = dto.email ? dto.email.trim().toLowerCase() : '';
    const nombres = dto.nombres ? dto.nombres.trim() : '';
    const apellidos = dto.apellidos ? dto.apellidos.trim() : '';
    const password = dto.password ? dto.password.trim() : '';

    if (!emailNormalizado || !dto.cedula || !nombres || !apellidos || !dto.rol) {
      throw new DomainException('Cédula, correo electrónico, nombres, apellidos y rol son obligatorios');
    }

    if (password) {
      if (password.length < 8) {
        throw new DomainException('La contraseña debe contener al menos 8 caracteres');
      }
      if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        throw new DomainException('La contraseña debe incluir mayúsculas, minúsculas y números');
      }
    }

    const usuarioPorEmail = await this.usuarioRepo.obtenerPorEmail(emailNormalizado);
    if (usuarioPorEmail) {
      throw new UsuarioException(`Ya existe un usuario registrado con el correo '${emailNormalizado}'`);
    }

    const cedulaLimpia = dto.cedula.trim();
    const usuarioPorCedula = await this.usuarioRepo.obtenerPorCedula(cedulaLimpia);
    if (usuarioPorCedula) {
      throw new UsuarioException(`Ya existe un usuario registrado con la cédula '${cedulaLimpia}'`);
    }

    const cedulaValida = new Cedula(cedulaLimpia);
    const nuevoUsuario = new Usuario(
      emailNormalizado,
      cedulaValida,
      nombres,
      apellidos,
      dto.rol,
      true
    );

    if (dto.cooperativaId) {
      nuevoUsuario.cooperativaId = dto.cooperativaId;
    }

    let creado: Usuario;

    // Si se especifica contraseña y se inyecta repositorio de autenticación, registrar en auth provider
    if (password && this.authRepo) {
      creado = await this.authRepo.registrarse(nuevoUsuario, password);
    } else {
      creado = await this.usuarioRepo.guardar(nuevoUsuario);
    }

    if (this.auditRepo) {
      this.auditRepo.registrarEvento({
        accion: 'CREAR_USUARIO',
        entidadAfectada: 'Usuarios',
        entidadId: creado.id,
        detalle: `Creación de usuario ${creado.nombres} ${creado.apellidos} (${creado.email}) con rol ${creado.rol}`,
        resultado: 'Exito',
      }).catch(() => {});
    }

    return creado;
  }

  async ejecutar(dto: CrearUsuarioDto): Promise<Usuario> {
    return this.execute(dto);
  }
}

export const crearUsuarioUseCase = new CrearUsuario(
  new SupabaseUsuarioRepository(),
  new SupabaseAuthRepository(),
  new SupabaseAuditRepository()
);
