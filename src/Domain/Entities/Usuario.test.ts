import { describe, expect, it } from 'vitest';
import { Usuario } from './Usuario';
import { Cedula } from '../ValueObjects/Cedula';
import { RolUsuario } from '../Constants/EstadosSistema';

describe('Usuario (Entidad de Dominio: Cuenta de Usuario)', () => {
  const cedulaValida = new Cedula('1710034065');

  it('se inicializa como cliente activo por defecto con datos válidos', () => {
    const usuario = new Usuario(
      'usuario@example.com',
      cedulaValida,
      'Ana',
      'Gomez',
    );

    expect(usuario.esValida()).toBe(true);
    expect(usuario.rol).toBe(RolUsuario.CLIENTE);
    expect(usuario.activo).toBe(true);
    expect(usuario.nombreCompleto).toBe('Ana Gomez');
  });

  it('rechaza correos electrónicos con formato inválido', () => {
    const usuarioInvalido = new Usuario(
      'correo-invalido',
      cedulaValida,
      'Ana',
      'Gomez',
    );
    expect(usuarioInvalido.esValida()).toBe(false);
  });

  it('rechaza nombres o apellidos vacíos', () => {
    const usuarioSinNombre = new Usuario(
      'usuario@example.com',
      cedulaValida,
      '   ',
      'Gomez',
    );
    expect(usuarioSinNombre.esValida()).toBe(false);

    const usuarioSinApellido = new Usuario(
      'usuario@example.com',
      cedulaValida,
      'Ana',
      '',
    );
    expect(usuarioSinApellido.esValida()).toBe(false);
  });

  it('permite desactivar y reactivar la cuenta de usuario', () => {
    const usuario = new Usuario(
      'usuario@example.com',
      cedulaValida,
      'Carlos',
      'Mendoza',
    );

    usuario.desactivar();
    expect(usuario.activo).toBe(false);

    usuario.activar();
    expect(usuario.activo).toBe(true);
  });

  it('permite cambiar el rol a uno válido y rechaza roles inexistentes', () => {
    const usuario = new Usuario(
      'chofer@example.com',
      cedulaValida,
      'Pedro',
      'Ramirez',
    );

    usuario.cambiarRol(RolUsuario.CHOFER);
    expect(usuario.rol).toBe(RolUsuario.CHOFER);

    expect(() => usuario.cambiarRol('super-admin' as any)).toThrow();
  });

  it('valida si puede operar como chofer (requiere rol chofer, estar activo y tener cooperativa asignada)', () => {
    const usuario = new Usuario(
      'chofer@example.com',
      cedulaValida,
      'Pedro',
      'Ramirez',
      RolUsuario.CHOFER,
    );

    // Sin cooperativa asignada aún
    expect(usuario.puedeOperarComoChofer()).toBe(false);

    // Asignando cooperativa
    usuario.asignarCooperativa(1);
    expect(usuario.puedeOperarComoChofer()).toBe(true);

    // Si se desactiva, ya no puede operar
    usuario.desactivar();
    expect(usuario.puedeOperarComoChofer()).toBe(false);
  });

  it('valida si es administrador activo', () => {
    const admin = new Usuario(
      'admin@sistema.com',
      cedulaValida,
      'Admin',
      'General',
      RolUsuario.ADMIN,
    );

    expect(admin.esAdministrador()).toBe(true);

    admin.desactivar();
    expect(admin.esAdministrador()).toBe(false);
  });

  it('actualiza los datos personales correctamente', () => {
    const usuario = new Usuario(
      'user@test.com',
      cedulaValida,
      'Juan',
      'Perez',
    );

    usuario.actualizarDatosPersonales('Juan Carlos', 'Perez Gomez');
    expect(usuario.nombres).toBe('Juan Carlos');
    expect(usuario.apellidos).toBe('Perez Gomez');
    expect(usuario.nombreCompleto).toBe('Juan Carlos Perez Gomez');

    expect(() => usuario.actualizarDatosPersonales('', 'Perez')).toThrow();
  });
});
