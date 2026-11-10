import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useReportarIncidente } from './useReportarIncidente';
import { EstadoBus } from '../../Domain/Constants/EstadosSistema';

const mocks = vi.hoisted(() => ({
  reportarEjecutar: vi.fn(),
  reactivarEjecutar: vi.fn(),
}));

// El composable crea sus dependencias adentro: se sustituyen para no tocar Supabase.
vi.mock('../../Infrastructure/Repositories/SupabaseBusRepository', () => ({
  SupabaseBusRepository: class {},
}));

vi.mock('../../Application/UseCases/ReportarIncidenteOperativo', () => ({
  ReportarIncidenteOperativo: class {
    ejecutar = mocks.reportarEjecutar;
  },
}));

vi.mock('../../Application/UseCases/ReactivarBus', () => ({
  ReactivarBus: class {
    ejecutar = mocks.reactivarEjecutar;
  },
}));

describe('useReportarIncidente', () => {
  const respuestaIncidente = {
    success: true,
    incidenteId: 'INC-5-1',
    busActualizado: { id: 5, numero: '25', estado: EstadoBus.MANTENIMIENTO },
    motivo: 'AveriaMecanica',
    descripcion: 'Falla en el motor',
    acciones: {
      reemplazoPosible: true,
      busReemplazoSugerido: { id: 6, numero: '30' },
      mensaje: 'Bus 25 marcado como En mantenimiento.',
    },
  };

  const respuestaReactivar = {
    success: true,
    busReactivado: { id: 5, numero: '25', estado: EstadoBus.ACTIVO },
    reactivadoPor: 'admin-1',
    mensaje: 'Bus 25 ha sido reactivado exitosamente.',
  };

  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.reportarEjecutar.mockResolvedValue(respuestaIncidente);
    mocks.reactivarEjecutar.mockResolvedValue(respuestaReactivar);
  });

  it('debe iniciar con el formulario vacío, la fecha de hoy y sin mensajes', () => {
    const { formIncidente, loading, error, success, responseData } = useReportarIncidente();

    expect(formIncidente.busNumero).toBe('');
    expect(formIncidente.motivo).toBe('');
    expect(formIncidente.descripcion).toBe('');
    expect(formIncidente.replacementBusNumero).toBe('');
    expect(formIncidente.reportadoPor).toBe('');
    expect(formIncidente.fechaIncidente).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(loading.value).toBe(false);
    expect(error.value).toBe('');
    expect(success.value).toBe(false);
    expect(responseData.value).toBeNull();
  });

  it('debe exponer el catálogo con los cuatro motivos válidos', () => {
    const { motivosCatalogo } = useReportarIncidente();

    expect(motivosCatalogo.map((motivo) => motivo.value)).toEqual([
      'AveriaMecanica',
      'Accidente',
      'ReparacionProgramada',
      'Otro',
    ]);
  });

  it('debe autocompletar la descripción al seleccionar un motivo del catálogo', () => {
    const { formIncidente, motivosCatalogo, seleccionarMotivo } = useReportarIncidente();

    seleccionarMotivo('AveriaMecanica');

    expect(formIncidente.motivo).toBe('AveriaMecanica');
    expect(formIncidente.descripcion).toBe(motivosCatalogo[0].descripcion);
    expect(formIncidente.descripcion).not.toBe('');
  });

  it('debe limpiar la descripción al seleccionar el motivo Otro', () => {
    const { formIncidente, seleccionarMotivo } = useReportarIncidente();
    seleccionarMotivo('Accidente');

    seleccionarMotivo('Otro');

    expect(formIncidente.motivo).toBe('Otro');
    expect(formIncidente.descripcion).toBe('');
  });

  it.each([
    { caso: 'sin número de bus', busNumero: '', motivo: 'Accidente' },
    { caso: 'sin motivo', busNumero: '25', motivo: '' },
  ])('debe rechazar el reporte $caso sin llamar al caso de uso', async ({ busNumero, motivo }) => {
    const { formIncidente, error, success, loading, reportarIncidente } = useReportarIncidente();
    formIncidente.busNumero = busNumero;
    formIncidente.motivo = motivo;

    await reportarIncidente();

    expect(error.value).toBe('Bus y Motivo son campos obligatorios.');
    expect(success.value).toBe(false);
    expect(loading.value).toBe(false);
    expect(mocks.reportarEjecutar).not.toHaveBeenCalled();
  });

  it('debe enviar los datos normalizados con la cooperativa 1 por defecto', async () => {
    const { formIncidente, reportarIncidente } = useReportarIncidente();
    formIncidente.busNumero = '  25  ';
    formIncidente.motivo = 'AveriaMecanica';
    formIncidente.descripcion = 'Falla en el motor';
    formIncidente.fechaIncidente = '2026-10-26';
    formIncidente.replacementBusNumero = ' 30 ';
    formIncidente.reportadoPor = 'admin-1';

    await reportarIncidente();

    expect(mocks.reportarEjecutar).toHaveBeenCalledTimes(1);
    expect(mocks.reportarEjecutar).toHaveBeenCalledWith({
      cooperativaId: 1,
      busNumero: '25',
      motivo: 'AveriaMecanica',
      descripcion: 'Falla en el motor',
      fechaIncidente: '2026-10-26',
      replacementBusNumero: '30',
      reportadoPor: 'admin-1',
    });
  });

  it('debe enviar null cuando no hay bus de reemplazo ni quien reporta', async () => {
    const { formIncidente, reportarIncidente } = useReportarIncidente();
    formIncidente.busNumero = '25';
    formIncidente.motivo = 'Accidente';

    await reportarIncidente();

    expect(mocks.reportarEjecutar).toHaveBeenCalledWith(
      expect.objectContaining({ replacementBusNumero: null, reportadoPor: null })
    );
  });

  it('debe usar el cooperativaId recibido como parámetro', async () => {
    const { formIncidente, reportarIncidente } = useReportarIncidente(4);
    formIncidente.busNumero = '25';
    formIncidente.motivo = 'Accidente';

    await reportarIncidente();

    expect(mocks.reportarEjecutar).toHaveBeenCalledWith(
      expect.objectContaining({ cooperativaId: 4 })
    );
  });

  it('debe guardar la respuesta, marcar el éxito y limpiar el formulario', async () => {
    const { formIncidente, success, error, loading, responseData, reportarIncidente } =
      useReportarIncidente();
    formIncidente.busNumero = '25';
    formIncidente.motivo = 'AveriaMecanica';
    formIncidente.descripcion = 'Falla en el motor';
    formIncidente.replacementBusNumero = '30';

    await reportarIncidente();

    expect(responseData.value).toEqual(respuestaIncidente);
    expect(success.value).toBe(true);
    expect(error.value).toBe('');
    expect(loading.value).toBe(false);
    expect(formIncidente.busNumero).toBe('');
    expect(formIncidente.motivo).toBe('');
    expect(formIncidente.descripcion).toBe('');
    expect(formIncidente.replacementBusNumero).toBe('');
  });

  it('debe mantener loading en true mientras se reporta y en false al terminar', async () => {
    let resolver!: (valor: unknown) => void;
    mocks.reportarEjecutar.mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      })
    );
    const { formIncidente, loading, reportarIncidente } = useReportarIncidente();
    formIncidente.busNumero = '25';
    formIncidente.motivo = 'Accidente';

    const promesa = reportarIncidente();
    expect(loading.value).toBe(true);

    resolver(respuestaIncidente);
    await promesa;
    expect(loading.value).toBe(false);
  });

  it('debe registrar el error y conservar el formulario si falla el caso de uso', async () => {
    mocks.reportarEjecutar.mockRejectedValue(new Error('Bus no encontrado'));
    const { formIncidente, error, success, loading, responseData, reportarIncidente } =
      useReportarIncidente();
    formIncidente.busNumero = '99';
    formIncidente.motivo = 'Accidente';

    await reportarIncidente();

    expect(error.value).toBe('Bus no encontrado');
    expect(success.value).toBe(false);
    expect(loading.value).toBe(false);
    expect(responseData.value).toBeNull();
    expect(formIncidente.busNumero).toBe('99');
    expect(formIncidente.motivo).toBe('Accidente');
  });

  it('debe usar un mensaje por defecto si el error del reporte no trae mensaje', async () => {
    mocks.reportarEjecutar.mockRejectedValue(new Error(''));
    const { formIncidente, error, reportarIncidente } = useReportarIncidente();
    formIncidente.busNumero = '25';
    formIncidente.motivo = 'Accidente';

    await reportarIncidente();

    expect(error.value).toBe('Error al reportar el incidente operativo.');
  });

  it('debe limpiar el error anterior al reintentar con éxito', async () => {
    mocks.reportarEjecutar
      .mockRejectedValueOnce(new Error('Falla temporal'))
      .mockResolvedValueOnce(respuestaIncidente);
    const { formIncidente, error, success, reportarIncidente } = useReportarIncidente();
    formIncidente.busNumero = '25';
    formIncidente.motivo = 'Accidente';

    await reportarIncidente();
    expect(error.value).toBe('Falla temporal');

    await reportarIncidente();
    expect(error.value).toBe('');
    expect(success.value).toBe(true);
  });

  it('debe reactivar un bus enviando su id y quién lo reactiva', async () => {
    const { success, error, loading, reactivarBusOperativo } = useReportarIncidente();

    await reactivarBusOperativo(5, 'admin-1');

    expect(mocks.reactivarEjecutar).toHaveBeenCalledWith({ busId: 5, reactivadoPor: 'admin-1' });
    expect(success.value).toBe(true);
    expect(error.value).toBe('');
    expect(loading.value).toBe(false);
  });

  it('debe registrar el error si falla la reactivación del bus', async () => {
    mocks.reactivarEjecutar.mockRejectedValue(new Error('Estado no reactivable'));
    const { success, error, loading, reactivarBusOperativo } = useReportarIncidente();

    await reactivarBusOperativo(5, 'admin-1');

    expect(error.value).toBe('Estado no reactivable');
    expect(success.value).toBe(false);
    expect(loading.value).toBe(false);
  });

  it('debe usar un mensaje por defecto si el error de reactivación no trae mensaje', async () => {
    mocks.reactivarEjecutar.mockRejectedValue(new Error(''));
    const { error, reactivarBusOperativo } = useReportarIncidente();

    await reactivarBusOperativo(5, 'admin-1');

    expect(error.value).toBe('Error al reactivar el bus.');
  });

  it('debe restablecer todos los campos al limpiar el formulario', () => {
    const { formIncidente, limpiarFormulario } = useReportarIncidente();
    formIncidente.busNumero = '25';
    formIncidente.motivo = 'Accidente';
    formIncidente.descripcion = 'Choque leve';
    formIncidente.replacementBusNumero = '30';
    formIncidente.reportadoPor = 'admin-1';

    limpiarFormulario();

    expect(formIncidente.busNumero).toBe('');
    expect(formIncidente.motivo).toBe('');
    expect(formIncidente.descripcion).toBe('');
    expect(formIncidente.replacementBusNumero).toBe('');
    expect(formIncidente.reportadoPor).toBe('');
    expect(formIncidente.fechaIncidente).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});