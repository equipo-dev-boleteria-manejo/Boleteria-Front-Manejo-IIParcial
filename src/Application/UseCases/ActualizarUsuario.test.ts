import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActualizarUsuario } from './ActualizarUsuario';
import type { IUsuarioRepository } from '../../Domain/Repositories/IUsuarioRepository';
import { Usuario } from '../../Domain/Entities/Usuario';
import { Cedula } from '../../Domain/ValueObjects/Cedula';
import { RolUsuario } from '../../Domain/Constants/EstadosSistema';
import { DomainException } from '../../Domain/Exceptions/DomainException';
import { UsuarioNoEncontradoException } from '../../Domain/Exceptions/UsuarioException';

describe('ActualizarUsuario UseCase', () => {
  let mockUsuarioRepo: IUsuarioRepository;
  let useCase: ActualizarUsuario;
  let usuarioOriginal: Usuario;

  beforeEach(() => {
    usuarioOriginal = new Usuario(
      'admin@boleteria.com',
      new Cedula('1710034065'),
      'Nombre',
      'Original',
      RolUsuario.CLIENTE
    );
    usuarioOriginal.id = 'usr-uuid-edit';

    mockUsuarioRepo = {
      obtenerPorId: vi.fn().mockResolvedValue(usuarioOriginal),
      obtenerPorEmail: vi.fn(),
      obtenerPorCedula: vi.fn(),
      obtenerTodos: vi.fn(),
      guardar: vi.fn(),
      actualizar: vi.fn().mockImplementation(async (usr) => usr),
      desactivar: vi.fn(),
    };

    useCase = new ActualizarUsuario(mockUsuarioRepo);
  });

  it('debe actualizar los datos de un usuario existente', async () => {
    const input = {
      id: 'usr-uuid-edit',
      nombres: 'Nombre Nuevo',
      apellidos: 'Apellido Actualizado',
      rol: RolUsuario.OFICINISTA,
      cooperativaId: 2,
    };

    const resultado = await useCase.execute(input);

    expect(resultado.nombres).toBe('Nombre Nuevo');
    expect(resultado.apellidos).toBe('Apellido Actualizado');
    expect(resultado.rol).toBe(RolUsuario.OFICINISTA);
    expect(resultado.cooperativaId).toBe(2);
    expect(mockUsuarioRepo.actualizar).toHaveBeenCalledTimes(1);
  });

  it('debe lanzar DomainException si no se envía id o nombres obligatorios', async () => {
    await expect(
      useCase.execute({ id: '', nombres: 'A', apellidos: 'B', rol: RolUsuario.CLIENTE })
    ).rejects.toThrow(DomainException);
  });

  it('debe lanzar UsuarioNoEncontradoException si el id no existe', async () => {
    mockUsuarioRepo.obtenerPorId = vi.fn().mockResolvedValue(null);

    await expect(
      useCase.execute({ id: 'no-existe', nombres: 'A', apellidos: 'B', rol: RolUsuario.CLIENTE })
    ).rejects.toThrow(UsuarioNoEncontradoException);
  });
});
