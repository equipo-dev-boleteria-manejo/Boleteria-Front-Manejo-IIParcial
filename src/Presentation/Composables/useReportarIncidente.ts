import { ref, reactive } from 'vue';
import { ReportarIncidenteOperativo, ReportarIncidenteOperativoResponse } from '../../Application/UseCases/ReportarIncidenteOperativo';
import { ReactivarBus, ReactivarBusResponse } from '../../Application/UseCases/ReactivarBus';
import { SupabaseBusRepository } from '../../Infrastructure/Repositories/SupabaseBusRepository';
import { SupabaseRutaRepository } from '../../Infrastructure/Repositories/SupabaseRutaRepository';
import { SupabaseVentasRepository } from '../../Infrastructure/Repositories/SupabaseVentasRepository';
import { ReportarIncidenteOperativoDto } from '../../Application/Dtos/ReportarIncidenteOperativoDto';
import { ReactivarBusDto } from '../../Application/Dtos/ReactivarBusDto';

export interface FormIncidente {
  busNumero: string;
  motivo: string;
  descripcion: string;
  fechaIncidente: string;
  replacementBusNumero: string;
  reportadoPor: string;
}

export function useReportarIncidente() {
  const busRepository = new SupabaseBusRepository();
  const rutaRepository = new SupabaseRutaRepository();
  const ventaRepository = new SupabaseVentasRepository();

  const reportarIncidenteUseCase = new ReportarIncidenteOperativo(
    busRepository,
    rutaRepository,
    ventaRepository
  );
  const reactivarBusUseCase = new ReactivarBus(busRepository);

  const loading = ref(false);
  const error = ref('');
  const success = ref(false);
  const responseData = ref<ReportarIncidenteOperativoResponse | null>(null);

  const formIncidente = reactive<FormIncidente>({
    busNumero: '',
    motivo: '',
    descripcion: '',
    fechaIncidente: new Date().toISOString().split('T')[0],
    replacementBusNumero: '',
    reportadoPor: '',
  });

  const motivosCatalogo = [
    { value: 'AveriaMecanica', label: 'Avería Mecánica', descripcion: 'El bus presenta una avería mecánica y no puede continuar en servicio.' },
    { value: 'Accidente', label: 'Accidente', descripcion: 'El bus sufrió un accidente y requiere evaluación antes de volver a operar.' },
    { value: 'ReparacionProgramada', label: 'Reparación Programada', descripcion: 'El bus fue retirado para una reparación programada de mantenimiento.' },
    { value: 'Otro', label: 'Otro', descripcion: '' },
  ];

  function seleccionarMotivo(motivo: string) {
    formIncidente.motivo = motivo;

    if (motivo === 'Otro') {
      formIncidente.descripcion = '';
      return;
    }

    const motivoSeleccionado = motivosCatalogo.find((item) => item.value === motivo);
    formIncidente.descripcion = motivoSeleccionado?.descripcion ?? '';
  }

  async function reportarIncidente() {
    try {
      loading.value = true;
      error.value = '';
      success.value = false;

      // Validar campos obligatorios
      if (!formIncidente.busNumero || !formIncidente.motivo) {
        throw new Error('Bus y Motivo son campos obligatorios.');
      }

      const dto: ReportarIncidenteOperativoDto = {
        busNumero: formIncidente.busNumero.trim(),
        motivo: formIncidente.motivo,
        descripcion: formIncidente.descripcion,
        fechaIncidente: formIncidente.fechaIncidente,
        replacementBusNumero: formIncidente.replacementBusNumero ? formIncidente.replacementBusNumero.trim() : null,
        reportadoPor: formIncidente.reportadoPor || null,
      };

      responseData.value = await reportarIncidenteUseCase.ejecutar(dto);
      success.value = true;

      // Limpiar formulario
      limpiarFormulario();
    } catch (err: any) {
      error.value = err.message || 'Error al reportar el incidente operativo.';
      success.value = false;
    } finally {
      loading.value = false;
    }
  }

  async function reactivarBusOperativo(busId: number, reactivadoPor: string) {
    try {
      loading.value = true;
      error.value = '';
      success.value = false;

      const dto: ReactivarBusDto = {
        busId,
        reactivadoPor,
      };

      await reactivarBusUseCase.ejecutar(dto);
      success.value = true;
    } catch (err: any) {
      error.value = err.message || 'Error al reactivar el bus.';
      success.value = false;
    } finally {
      loading.value = false;
    }
  }

  function limpiarFormulario() {
    formIncidente.busNumero = '';
    formIncidente.motivo = '';
    formIncidente.descripcion = '';
    formIncidente.fechaIncidente = new Date().toISOString().split('T')[0];
    formIncidente.replacementBusNumero = '';
    formIncidente.reportadoPor = '';
  }

  return {
    formIncidente,
    motivosCatalogo,
    seleccionarMotivo,
    loading,
    error,
    success,
    responseData,
    reportarIncidente,
    reactivarBusOperativo,
    limpiarFormulario,
  };
}
