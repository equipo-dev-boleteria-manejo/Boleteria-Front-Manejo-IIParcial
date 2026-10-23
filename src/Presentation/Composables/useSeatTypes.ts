import { ref, computed } from 'vue';
import { ISeatTypeRepository } from '../../Domain/Repositories/ISeatTypeRepository';
import { SeatTypeUseCases } from '../../Application/UseCases/SeatTypeUseCases';
import { SeatTypeResponseDTO, ValidarAsignacionInputDTO } from '../../Application/Dtos/SeatTypeDTOs';

export function useSeatTypes(repository: ISeatTypeRepository) {
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

  const calcularTarifa = (precioBase: number, descuento: number = 0): number => {
    try {
      return useCases.calcularTarifaAsiento({ precioBase, porcentajeDescuento: descuento });
    } catch (e) {
      const err = e as Error;
      error.value = err.message;
      return precioBase;
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