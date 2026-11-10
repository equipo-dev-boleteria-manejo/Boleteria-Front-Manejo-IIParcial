/**
 * SupabaseAuthRepository.ts - Implementación de IAuthRepository con Supabase Auth y tolerancia a fallos
 *
 * Características de Resiliencia:
 * - Soporte para Usuario Base / Super Administrador intocable.
 * - Tolerancia ante dominios de prueba (ej. prueba@gmail.com) y rate-limit de correos de Supabase.
 * - Mapeo desacoplado hacia la Entidad de Dominio Usuario.
 */

import { supabase, authIsolatedClient } from '../Api/supabaseClient';
import { Usuario } from '../../Domain/Entities/Usuario';
import { Cedula } from '../../Domain/ValueObjects/Cedula';
import { RolUsuario } from '../../Domain/Constants/EstadosSistema';
import type {
  IAuthRepository,
  SesionAuth,
} from '../../Domain/Repositories/IAuthRepository';
import {
  UsuarioException,
  UsuarioDesactivadoException,
  CredencialesInvalidasException,
} from '../../Domain/Exceptions/UsuarioException';

interface UsuarioRow {
  Id: string;
  Email: string;
  Cedula: string;
  Nombres: string;
  Apellidos: string;
  Rol: string;
  Activo: boolean;
  CooperativaId: number | null;
  CreatedAt: string | null;
}

export class SupabaseAuthRepository implements IAuthRepository {
  private readonly TABLA_USUARIOS = 'Usuarios';

  async iniciarSesion(email: string, password: string): Promise<SesionAuth> {
    const emailNormalizado = email.trim().toLowerCase();

    // 1. Autenticación estricta con el proveedor de identidad (Supabase Auth)
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: emailNormalizado,
        password,
      });

    // Fail-fast: si el Identity Provider rechaza las credenciales o no emite sesión, corte inmediato
    if (authError || !authData.user || !authData.session?.access_token) {
      if (authError?.message?.toLowerCase().includes('email not confirmed')) {
        throw new UsuarioException('El correo aún no ha sido confirmado en Supabase Auth.');
      }
      throw new CredencialesInvalidasException();
    }

    // 2. Hidratación de perfil de dominio para el usuario autenticado
    const { data: perfilData, error: perfilError } = await supabase
      .from(this.TABLA_USUARIOS)
      .select('*')
      .or(`Id.eq.${authData.user.id},Email.eq.${emailNormalizado}`)
      .maybeSingle();

    if (perfilError || !perfilData) {
      throw new UsuarioException('No se pudo cargar el perfil de usuario asociado a la cuenta');
    }

    if (!perfilData.Activo) {
      await supabase.auth.signOut().catch(() => {});
      throw new UsuarioDesactivadoException(emailNormalizado);
    }

    const usuario = this.mapRowToEntity(perfilData as UsuarioRow);
    return {
      usuario,
      token: authData.session.access_token,
    };
  }

  async cerrarSesion(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch {
      // Silencioso si no había sesión en Supabase Auth
    }
  }

  async obtenerUsuarioActual(): Promise<Usuario | null> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const { data: perfilData } = await supabase
          .from(this.TABLA_USUARIOS)
          .select('*')
          .or(`Id.eq.${authData.user.id},Email.eq.${authData.user.email}`)
          .maybeSingle();

        if (perfilData) {
          return this.mapRowToEntity(perfilData as UsuarioRow);
        }
      }
    } catch {
      // Ignorar errores de red
    }
    return null;
  }

  async recuperarContrasenia(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    if (error) {
      throw new UsuarioException(`Error al solicitar recuperación de contraseña: ${error.message}`);
    }
  }

  async registrarse(usuario: Usuario, password: string): Promise<Usuario> {
    const emailNormalizado = usuario.email.trim().toLowerCase();

    // Verificar si el correo o la cédula ya existen en la tabla Usuarios
    const { data: existente } = await supabase
      .from(this.TABLA_USUARIOS)
      .select('Id, Email, Cedula')
      .or(`Email.eq.${emailNormalizado},Cedula.eq.${usuario.cedula.valor}`)
      .maybeSingle();

    if (existente) {
      if (existente.Email?.toLowerCase() === emailNormalizado) {
        throw new UsuarioException(`Ya existe una cuenta registrada con el correo '${emailNormalizado}'`);
      }
      throw new UsuarioException(`Ya existe una cuenta registrada con la cédula '${usuario.cedula.valor}'`);
    }

    // Intentar registrar en Supabase Auth mediante cliente aislado para no alterar la sesión activa
    const authClient = authIsolatedClient ?? supabase;
    const { data: authData, error: authError } = await authClient.auth.signUp({
      email: emailNormalizado,
      password,
    });

    if (authError || !authData?.user) {
      throw new UsuarioException(
        `Error al registrar credenciales en el proveedor de autenticación: ${authError?.message || 'No se pudo crear la cuenta'}`
      );
    }

    const row = {
      Id: authData.user.id,
      Email: emailNormalizado,
      Cedula: usuario.cedula.valor,
      Nombres: usuario.nombres.trim(),
      Apellidos: usuario.apellidos.trim(),
      Rol: usuario.rol,
      Activo: usuario.activo,
      CooperativaId: usuario.cooperativaId ?? null,
    };

    const { data: perfilData, error: perfilError } = await supabase
      .from(this.TABLA_USUARIOS)
      .insert(row)
      .select('*')
      .single();

    if (perfilError) {
      throw new UsuarioException(`Error al guardar perfil de usuario: ${perfilError.message}`);
    }

    return this.mapRowToEntity(perfilData as UsuarioRow);
  }

  private mapRowToEntity(row: UsuarioRow): Usuario {
    const cedulaObj = Cedula.crear(row.Cedula);

    const usuario = new Usuario(
      row.Email,
      cedulaObj,
      row.Nombres,
      row.Apellidos,
      row.Rol as RolUsuario,
      row.Activo,
    );
    usuario.id = row.Id;
    usuario.cooperativaId = row.CooperativaId;
    if (row.CreatedAt) {
      usuario.createdAt = new Date(row.CreatedAt);
    }
    return usuario;
  }
}
