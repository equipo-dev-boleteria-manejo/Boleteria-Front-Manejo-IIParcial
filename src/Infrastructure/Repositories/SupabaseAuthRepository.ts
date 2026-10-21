/**
 * SupabaseAuthRepository.ts - Implementación de IAuthRepository con Supabase Auth
 */

import { supabase } from '../Api/supabaseClient';
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

export class SupabaseAuthRepository implements IAuthRepository {
  private readonly TABLA_USUARIOS = 'Usuarios';

  async iniciarSesion(email: string, password: string): Promise<SesionAuth> {
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

    if (authError || !authData.user) {
      throw new CredencialesInvalidasException();
    }

    const { data: perfilData, error: perfilError } = await supabase
      .from(this.TABLA_USUARIOS)
      .select('*')
      .or(`Id.eq.${authData.user.id},Email.eq.${email.trim().toLowerCase()}`)
      .maybeSingle();

    if (perfilError || !perfilData) {
      throw new UsuarioException('No se pudo cargar el perfil de usuario asociado a la cuenta');
    }

    if (!perfilData.Activo) {
      await supabase.auth.signOut();
      throw new UsuarioDesactivadoException(email);
    }

    const usuario = this.mapRowToEntity(perfilData);
    return {
      usuario,
      token: authData.session?.access_token,
    };
  }

  async cerrarSesion(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new UsuarioException(`Error al cerrar sesión: ${error.message}`);
    }
  }

  async obtenerUsuarioActual(): Promise<Usuario | null> {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return null;

    const { data: perfilData } = await supabase
      .from(this.TABLA_USUARIOS)
      .select('*')
      .or(`Id.eq.${authData.user.id},Email.eq.${authData.user.email}`)
      .maybeSingle();

    if (!perfilData) return null;
    return this.mapRowToEntity(perfilData);
  }

  async recuperarContrasenia(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    if (error) {
      throw new UsuarioException(`Error al solicitar recuperación de contraseña: ${error.message}`);
    }
  }

  async registrarse(usuario: Usuario, password: string): Promise<Usuario> {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: usuario.email.trim().toLowerCase(),
      password,
    });

    if (authError || !authData.user) {
      throw new UsuarioException(`Error al registrar usuario en Supabase Auth: ${authError?.message}`);
    }

    const row = {
      Id: authData.user.id,
      Email: usuario.email.trim().toLowerCase(),
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

    return this.mapRowToEntity(perfilData);
  }

  private mapRowToEntity(row: any): Usuario {
    let cedulaObj: Cedula;
    try {
      cedulaObj = Cedula.crear(row.Cedula);
    } catch {
      cedulaObj = Object.create(Cedula.prototype);
      Object.defineProperty(cedulaObj, '_valor', { value: row.Cedula, writable: false });
    }

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
