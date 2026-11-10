/**
 * GetUsuarios.ts - Caso de Uso para Consulta y Filtrado de Usuarios
 */

import type { IUsuarioRepository, UsuarioFiltros } from '../../Domain/Repositories/IUsuarioRepository';
import type { Usuario } from '../../Domain/Entities/Usuario';
import { SupabaseUsuarioRepository } from '../../Infrastructure/Repositories/SupabaseUsuarioRepository';

export class GetUsuarios {
  constructor(private readonly usuarioRepo: IUsuarioRepository) {}

  async execute(filtros?: UsuarioFiltros): Promise<Usuario[]> {
    return await this.usuarioRepo.obtenerTodos(filtros);
  }

  async ejecutar(filtros?: UsuarioFiltros): Promise<Usuario[]> {
    return this.execute(filtros);
  }
}

export const getUsuariosUseCase = new GetUsuarios(new SupabaseUsuarioRepository());
