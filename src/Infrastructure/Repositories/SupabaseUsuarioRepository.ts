/**
 * SupabaseUsuarioRepository.ts - Implementación de IUsuarioRepository con Supabase
 * Alineado estrictamente con la tabla "Usuarios" del esquema oficial.
 */

import { supabase } from '../Api/supabaseClient';
import { Usuario } from '../../Domain/Entities/Usuario';
import { Cedula } from '../../Domain/ValueObjects/Cedula';
import { RolUsuario } from '../../Domain/Constants/EstadosSistema';
import type {
  IUsuarioRepository,
  UsuarioFiltros,
} from '../../Domain/Repositories/IUsuarioRepository';
import {
  UsuarioException,
  UsuarioInvalidoException,
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

export class SupabaseUsuarioRepository implements IUsuarioRepository {
  private readonly TABLA_USUARIOS = 'Usuarios';

  async obtenerPorId(id: string): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from(this.TABLA_USUARIOS)
      .select('*')
      .eq('Id', id)
      .maybeSingle();

    if (error) {
      throw new UsuarioException(`Error al consultar usuario por ID ${id}: ${error.message}`);
    }

    if (!data) return null;
    return this.mapRowToEntity(data as UsuarioRow);
  }

  async obtenerPorEmail(email: string): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from(this.TABLA_USUARIOS)
      .select('*')
      .eq('Email', email.trim().toLowerCase())
      .maybeSingle();

    if (error) {
      throw new UsuarioException(`Error al consultar usuario por email ${email}: ${error.message}`);
    }

    if (!data) return null;
    return this.mapRowToEntity(data as UsuarioRow);
  }

  async obtenerPorCedula(cedula: string): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from(this.TABLA_USUARIOS)
      .select('*')
      .eq('Cedula', cedula.trim())
      .maybeSingle();

    if (error) {
      throw new UsuarioException(`Error al consultar usuario por cédula ${cedula}: ${error.message}`);
    }

    if (!data) return null;
    return this.mapRowToEntity(data as UsuarioRow);
  }

  async obtenerTodos(filtros?: UsuarioFiltros): Promise<Usuario[]> {
    let query = supabase.from(this.TABLA_USUARIOS).select('*');

    if (filtros?.rol) {
      query = query.eq('Rol', filtros.rol);
    }
    if (filtros?.activo !== undefined) {
      query = query.eq('Activo', filtros.activo);
    }
    if (filtros?.cooperativaId !== undefined) {
      query = query.eq('CooperativaId', filtros.cooperativaId);
    }

    const { data, error } = await query.order('CreatedAt', { ascending: false });

    if (error) {
      throw new UsuarioException(`Error al listar usuarios: ${error.message}`);
    }

    return (data as UsuarioRow[]).map((row) => this.mapRowToEntity(row));
  }

  async guardar(usuario: Usuario): Promise<Usuario> {
    if (!usuario.esValida()) {
      throw new UsuarioInvalidoException('El usuario a registrar contiene datos inválidos.');
    }

    const row = {
      Email: usuario.email.trim().toLowerCase(),
      Cedula: usuario.cedula.valor,
      Nombres: usuario.nombres.trim(),
      Apellidos: usuario.apellidos.trim(),
      Rol: usuario.rol,
      Activo: usuario.activo,
      CooperativaId: usuario.cooperativaId ?? null,
    };

    const { data, error } = await supabase
      .from(this.TABLA_USUARIOS)
      .insert(row)
      .select('*')
      .single();

    if (error) {
      throw new UsuarioException(`Error al insertar usuario: ${error.message}`);
    }

    return this.mapRowToEntity(data as UsuarioRow);
  }

  async actualizar(usuario: Usuario): Promise<Usuario> {
    if (!usuario.id) {
      throw new UsuarioInvalidoException('No se puede actualizar un usuario sin identificador único (ID)');
    }
    if (!usuario.esValida()) {
      throw new UsuarioInvalidoException('Datos de usuario inválidos para actualización');
    }

    const row = {
      Nombres: usuario.nombres.trim(),
      Apellidos: usuario.apellidos.trim(),
      Rol: usuario.rol,
      Activo: usuario.activo,
      CooperativaId: usuario.cooperativaId ?? null,
    };

    const { data, error } = await supabase
      .from(this.TABLA_USUARIOS)
      .update(row)
      .eq('Id', usuario.id)
      .select('*')
      .single();

    if (error) {
      throw new UsuarioException(`Error al actualizar usuario ${usuario.id}: ${error.message}`);
    }

    return this.mapRowToEntity(data as UsuarioRow);
  }

  async desactivar(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.TABLA_USUARIOS)
      .update({ Activo: false })
      .eq('Id', id);

    if (error) {
      throw new UsuarioException(`Error al desactivar usuario ${id}: ${error.message}`);
    }
  }

  private mapRowToEntity(row: UsuarioRow): Usuario {
    let cedulaObj: Cedula;
    try {
      cedulaObj = Cedula.crear(row.Cedula);
    } catch {
      // Fallback tolerante si en BD hubiera datos preexistentes
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
