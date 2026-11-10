import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DesactivarUsuario } from './DesactivarUsuario';
import type { IUsuarioRepository } from '../../Domain/Repositories/IUsuarioRepository';
import { Usuario } from '../../Domain/Entities/Usuario';
import { Cedula } from '../../Domain/ValueObjects/Cedula';
import { RolUsuario } from '../../Domain/Constants/EstadosSistema';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { UsuarioNoEncontradoException } from '../../Domain/Exceptions/UsuarioException';

describe('DesactivarUsuario UseCase', () => {
  let mockUsuarioRepo: IUsuarioRepository;
  let useCase: DesactivarUsuario;
  let usuarioValido: Usuario;

  beforeEach(() => {
    usuarioValido = new Usuario(
      'activo@boleteria.com',
      new Cedula('1710034065'),
      'Usuario',
      'Activo',
      RolUsuario.CLIENTE
    );
    usuarioValido.id = 'usr-uuid-desactivar';

    mockUsuarioRepo = {
      obtenerPorId: vi.fn().mockResolvedValue(usuarioValido),
      obtenerPorEmail: vi.fn(),
      obtenerPorCedula: vi.fn(),
      obtenerTodos: vi.fn(),
      guardar: vi.fn(),
      actualizar: vi.fn(),
      desactivar: vi.fn().mockResolvedValue(undefined),
    };

    useCase = new DesactivarUsuario(mockUsuarioRepo);
  });

  it('debe desactivar un usuario existente correctamente', async () => {
    await useCase.execute('usr-uuid-desactivar');

    expect(mockUsuarioRepo.obtenerPorId).toHaveBeenCalledWith('usr-uuid-desactivar');
    expect(mockUsuarioRepo.desactivar).toHaveBeenCalledWith('usr-uuid-desactivar');
  });

  it('debe lanzar DomainException si el id está vacío', async () => {
    await expect(useCase.execute('')).rejects.toThrow(DomainException);
  });

  it('debe lanzar UsuarioNoEncontradoException si el usuario a desactivar no existe', async () => {
    mockUsuarioRepo.obtenerPorId = vi.fn().mockResolvedValue(null);

    await expect(useCase.execute('id-fantasma')).rejects.toThrow(
      UsuarioNoEncontradoException
    );
    expect(mockUsuarioRepo.desactivar).not.toHaveBeenCalled();
  });

  it('debe impedir dar de baja al Super Administrador base del sistema', async () => {
    const adminIntocable = new Usuario(
      'admin@transporte.ec',
      new Cedula('1710034065'),
      'Super',
      'Administrador',
      RolUsuario.ADMIN
    );
    adminIntocable.id = 'admin-base-id';
    mockUsuarioRepo.obtenerPorId = vi.fn().mockResolvedValue(adminIntocable);

    await expect(useCase.execute('admin-base-id')).rejects.toThrow(DomainException);
    expect(mockUsuarioRepo.desactivar).not.toHaveBeenCalled();
  });
});
