import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetUsuarios } from './GetUsuarios';
import type { IUsuarioRepository } from '../../Domain/Repositories/IUsuarioRepository';
import { Usuario } from '../../Domain/Entities/Usuario';
import { Cedula } from '../../Domain/ValueObjects/Cedula';
import { RolUsuario } from '../../Domain/Constants/EstadosSistema';

describe('GetUsuarios UseCase', () => {
  let mockUsuarioRepo: IUsuarioRepository;
  let useCase: GetUsuarios;
  let listaUsuarios: Usuario[];

  beforeEach(() => {
    listaUsuarios = [
      new Usuario('u1@boleteria.com', new Cedula('1710034065'), 'Juan', 'Perez', RolUsuario.ADMIN),
      new Usuario('u2@boleteria.com', new Cedula('0926687856'), 'Ana', 'Gomez', RolUsuario.CLIENTE),
    ];

    mockUsuarioRepo = {
      obtenerPorId: vi.fn(),
      obtenerPorEmail: vi.fn(),
      obtenerPorCedula: vi.fn(),
      obtenerTodos: vi.fn().mockResolvedValue(listaUsuarios),
      guardar: vi.fn(),
      actualizar: vi.fn(),
      desactivar: vi.fn(),
    };

    useCase = new GetUsuarios(mockUsuarioRepo);
  });

  it('debe retornar todos los usuarios sin filtros', async () => {
    const resultado = await useCase.execute();

    expect(resultado).toHaveLength(2);
    expect(mockUsuarioRepo.obtenerTodos).toHaveBeenCalledWith(undefined);
  });

  it('debe aplicar filtros cuando son proporcionados', async () => {
    const filtros = { rol: RolUsuario.ADMIN, activo: true };
    await useCase.execute(filtros);

    expect(mockUsuarioRepo.obtenerTodos).toHaveBeenCalledWith(filtros);
  });
});
