import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GestionarViajeRuta } from './GestionarViajeRuta';
import type { IRutaRepository } from '../../Domain/Repositories/IRutaRepository';
import { Ruta } from '../../Domain/Entities/Ruta';
import { EstadoRuta } from '../../Domain/Constants/EstadosSistema';
import {
  RutaInvalidaException,
  RutaEstadoInvalidoException,
} from '../../Domain/Exceptions/RutaException';

describe('GestionarViajeRuta UseCase', () => {
  let useCase: GestionarViajeRuta;
  let mockRutaRepo: IRutaRepository;

  beforeEach(() => {
    mockRutaRepo = {
      obtenerTodas: vi.fn(),
      obtenerPorId: vi.fn(),
      obtenerPorHojaRuta: vi.fn(),
      obtenerPorBusYFecha: vi.fn(),
      obtenerPorChoferYFecha: vi.fn(),
      crear: vi.fn(),
      actualizar: vi.fn(),
      cambiarEstado: vi.fn(),
      eliminar: vi.fn(),
    };

    useCase = new GestionarViajeRuta(mockRutaRepo);
  });

  it('debe iniciar viaje cuando la ruta está en estado Programada', async () => {
    const r = new Ruta(1, 10, '2026-06-01', EstadoRuta.PROGRAMADA);
    r.id = 1;
    const rEnCurso = new Ruta(1, 10, '2026-06-01', EstadoRuta.EN_CURSO);
    rEnCurso.id = 1;

    vi.mocked(mockRutaRepo.obtenerPorId).mockResolvedValue(r);
    vi.mocked(mockRutaRepo.cambiarEstado).mockResolvedValue(rEnCurso);

    const res = await useCase.iniciarViaje(1);

    expect(res.estado).toBe(EstadoRuta.EN_CURSO);
    expect(mockRutaRepo.cambiarEstado).toHaveBeenCalledWith(1, EstadoRuta.EN_CURSO);
  });

  it('debe fallar al iniciar viaje si la ruta no está Programada', async () => {
    const rFinalizada = new Ruta(1, 10, '2026-06-01', EstadoRuta.FINALIZADA);
    rFinalizada.id = 1;

    vi.mocked(mockRutaRepo.obtenerPorId).mockResolvedValue(rFinalizada);

    await expect(useCase.iniciarViaje(1)).rejects.toThrow(RutaEstadoInvalidoException);
    expect(mockRutaRepo.cambiarEstado).not.toHaveBeenCalled();
  });

  it('debe finalizar viaje, calcular hora de llegada y cambiar estado a Finalizada', async () => {
    const r = new Ruta(1, 10, '2026-06-01', EstadoRuta.EN_CURSO);
    r.id = 1;
    const rFinalizada = new Ruta(1, 10, '2026-06-01', EstadoRuta.FINALIZADA);
    rFinalizada.id = 1;

    vi.mocked(mockRutaRepo.obtenerPorId).mockResolvedValue(r);
    vi.mocked(mockRutaRepo.actualizar).mockResolvedValue(rFinalizada);
    vi.mocked(mockRutaRepo.cambiarEstado).mockResolvedValue(rFinalizada);

    const res = await useCase.finalizarViaje(1, 'Sin incidentes');

    expect(res.estado).toBe(EstadoRuta.FINALIZADA);
    expect(mockRutaRepo.actualizar).toHaveBeenCalledWith(1, expect.objectContaining({
      observacionChofer: 'Sin incidentes',
      horaLlegada: expect.stringMatching(/^\d{2}:\d{2}$/),
    }));
    expect(mockRutaRepo.cambiarEstado).toHaveBeenCalledWith(1, EstadoRuta.FINALIZADA);
  });

  it('debe cancelar viaje con motivo registrado', async () => {
    const rCancelada = new Ruta(1, 10, '2026-06-01', EstadoRuta.CANCELADA);
    rCancelada.id = 1;

    vi.mocked(mockRutaRepo.actualizar).mockResolvedValue(rCancelada);
    vi.mocked(mockRutaRepo.cambiarEstado).mockResolvedValue(rCancelada);

    const res = await useCase.cancelarViaje(1, 'Derrumbe en vía');

    expect(res.estado).toBe(EstadoRuta.CANCELADA);
    expect(mockRutaRepo.actualizar).toHaveBeenCalledWith(1, {
      observacionChofer: 'Cancelado: Derrumbe en vía',
    });
    expect(mockRutaRepo.cambiarEstado).toHaveBeenCalledWith(1, EstadoRuta.CANCELADA);
  });

  it('debe registrar novedad de emergencia concatenando formato oficial', async () => {
    const r = new Ruta(1, 10, '2026-06-01', EstadoRuta.EN_CURSO);
    r.id = 1;
    r.observacionChofer = 'Salida puntual';

    const rActualizada = new Ruta(1, 10, '2026-06-01', EstadoRuta.EN_CURSO);
    rActualizada.id = 1;
    rActualizada.observacionChofer = 'Salida puntual | EMERGENCIA: Falla de frenos';

    vi.mocked(mockRutaRepo.obtenerPorId).mockResolvedValue(r);
    vi.mocked(mockRutaRepo.actualizar).mockResolvedValue(rActualizada);

    const res = await useCase.registrarEmergencia(1, 'Falla de frenos');

    expect(res.observacionChofer).toContain('EMERGENCIA: Falla de frenos');
    expect(mockRutaRepo.actualizar).toHaveBeenCalledWith(1, {
      observacionChofer: 'Salida puntual | EMERGENCIA: Falla de frenos',
    });
  });

  it('debe rechazar registro de emergencia si no se envía detalle', async () => {
    await expect(useCase.registrarEmergencia(1, '   ')).rejects.toThrow(RutaInvalidaException);
    expect(mockRutaRepo.actualizar).not.toHaveBeenCalled();
  });

  it('debe asignar chofer a la ruta', async () => {
    const r = new Ruta(1, 10, '2026-06-01', EstadoRuta.PROGRAMADA);
    r.id = 1;
    r.choferId = 'chofer-42';

    vi.mocked(mockRutaRepo.actualizar).mockResolvedValue(r);

    const res = await useCase.asignarChofer(1, 'chofer-42');

    expect(res.choferId).toBe('chofer-42');
    expect(mockRutaRepo.actualizar).toHaveBeenCalledWith(1, { choferId: 'chofer-42' });
  });

  it('debe eliminar ruta llamando al repositorio', async () => {
    vi.mocked(mockRutaRepo.eliminar).mockResolvedValue(undefined);

    await useCase.eliminarRuta(1);

    expect(mockRutaRepo.eliminar).toHaveBeenCalledWith(1);
  });
});
