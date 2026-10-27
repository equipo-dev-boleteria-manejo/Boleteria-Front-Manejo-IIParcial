import { ref, computed } from 'vue';
import { ISeatTypeRepository } from '../../Domain/Repositories/ISeatTypeRepository';
import { SupabaseSeatTypeRepository } from '../../Infrastructure/Repositories/SupabaseSeatTypeRepository';
import { SeatTypeUseCases } from '../../Application/UseCases/SeatTypeUseCases';
import { SeatTypeResponseDTO, ValidarAsignacionInputDTO } from '../../Application/Dtos/SeatTypeDTOs';

export function useSeatTypes(
  repository: ISeatTypeRepository = new SupabaseSeatTypeRepository()
) {
  const useCases = new SeatTypeUseCases(repository);

  const seatTypes = ref<SeatTypeResponseDTO[]>([]);
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);

  const tieneTiposAsiento = computed(() => seatTypes.value.length > 0);

  const cargarTiposAsiento = async (): Promise<void> => {
    loading.value = true;
    error.value = null;
    try {
      seatTypes.value = await useCases.obtenerTiposAsiento();
    } catch (e) {
      const err = e as Error;
      error.value = err.message || 'Error al cargar los tipos de asiento';
    } finally {
      loading.value = false;
    }
  };

  const calcularTarifa = async (
    precioBaseOrSeatTypeId: number | string,
    descuento: number = 0
  ): Promise<number> => {
    try {
      error.value = null;
      const input = typeof precioBaseOrSeatTypeId === 'number' && precioBaseOrSeatTypeId > 100
        ? { precioBase: precioBaseOrSeatTypeId, porcentajeDescuento: descuento }
        : { seatTypeId: precioBaseOrSeatTypeId, porcentajeDescuento: descuento };

      return await useCases.calcularTarifaAsiento(input);
    } catch (e) {
      const err = e as Error;
      error.value = err.message;
      return typeof precioBaseOrSeatTypeId === 'number' ? precioBaseOrSeatTypeId : 0;
    }
  };

  const validarAsignacion = (input: ValidarAsignacionInputDTO): boolean => {
    try {
      error.value = null;
      useCases.validarAsignacionAsiento(input);
      return true;
    } catch (e) {
      const err = e as Error;
      error.value = err.message;
      return false;
    }
  };

  return {
    seatTypes,
    loading,
    error,
    tieneTiposAsiento,
    cargarTiposAsiento,
    calcularTarifa,
    validarAsignacion,
  };
}