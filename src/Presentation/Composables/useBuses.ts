import { ref, onMounted } from "vue";
import type { Bus } from "../../Domain/Entities/Bus";
import {
	CrearBus,
	type CrearBusInput,
} from "../../Application/UseCases/CrearBus";
import { ActualizarBus } from "../../Application/UseCases/BusUseCases";
import { ReportarIncidenteOperativo } from "../../Application/UseCases/ReportarIncidenteOperativo";
import { SupabaseBusRepository } from "../../Infrastructure/Repositories/SupabaseBusRepository";
import { SupabaseRutaRepository } from "../../Infrastructure/Repositories/SupabaseRutaRepository";
import { SupabaseVentasRepository } from "../../Infrastructure/Repositories/SupabaseVentasRepository";

export function useBuses() {
	const buses = ref<Bus[]>([]);
	const loading = ref(false);
	const error = ref("");

	const busRepo = new SupabaseBusRepository();
	const rutaRepo = new SupabaseRutaRepository();
	const ventaRepo = new SupabaseVentasRepository();

	const crearBusUseCase = new CrearBus(busRepo);
	const actualizarBusUseCase = new ActualizarBus(busRepo);
	const reportarIncidenteUseCase = new ReportarIncidenteOperativo(
		busRepo,
		rutaRepo,
		ventaRepo
	);

	const nuevoBus = ref<CrearBusInput>({
		cooperativaId: 1, // Asumimos ID 1 para la única cooperativa
		numero: "",
		placa: "",
		totalAsientos: 40,
		estructura: "UnPiso",
	});

	async function cargarBuses() {
		try {
			loading.value = true;
			error.value = "";
			buses.value = await busRepo.obtenerTodos();
		} catch (err: any) {
			error.value = err.message || "Error al cargar los buses.";
		} finally {
			loading.value = false;
		}
	}

	async function registrarBus() {
		try {
			loading.value = true;
			error.value = "";
			await crearBusUseCase.ejecutar(nuevoBus.value);
			nuevoBus.value.numero = "";
			nuevoBus.value.placa = "";
			nuevoBus.value.estructura = "UnPiso";
			await cargarBuses();
		} catch (err: any) {
			error.value = err.message || "Error al registrar el bus.";
		} finally {
			loading.value = false;
		}
	}

	async function guardarBus(busData: {
		id: number;
		numero: string;
		placa: string;
		totalAsientos: number;
		estado: string;
		estructura: string;
	}) {
		try {
			loading.value = true;
			error.value = "";
			await actualizarBusUseCase.ejecutar(busData.id, {
				numero: busData.numero,
				placa: busData.placa,
				totalAsientos: busData.totalAsientos,
				estado: busData.estado,
				estructura: busData.estructura,
			});
			await cargarBuses();
		} catch (err: any) {
			error.value = err.message || "Error al actualizar el bus.";
		} finally {
			loading.value = false;
		}
	}

	async function reportarIncidenteYRefrescar(
		busId: number,
		replacementId: number | undefined,
		motivo: string,
		descripcion: string,
	) {
		try {
			loading.value = true;
			error.value = "";
			const bus = await busRepo.obtenerPorId(busId);
			if (!bus) {
				throw new Error("Bus no encontrado");
			}

			let replacementBusNumero: string | null = null;
			if (replacementId) {
				const busReemplazo = await busRepo.obtenerPorId(replacementId);
				if (busReemplazo) {
					replacementBusNumero = busReemplazo.numero;
				}
			}

			await reportarIncidenteUseCase.ejecutar({
				busNumero: bus.numero,
				motivo,
				descripcion,
				fechaIncidente: new Date().toISOString().split("T")[0],
				replacementBusNumero,
				reportadoPor: null,
			});

			await cargarBuses();
		} catch (err: any) {
			error.value = err.message || "Error al reportar el incidente.";
			throw err; // Re-throw to handle in UI if needed
		} finally {
			loading.value = false;
		}
	}

	onMounted(cargarBuses);

	return {
		buses,
		nuevoBus,
		loading,
		error,
		registrarBus,
		guardarBus,
		reportarIncidenteYRefrescar,
	};
}
