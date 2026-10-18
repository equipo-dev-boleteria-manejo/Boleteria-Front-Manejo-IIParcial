/**
 * IBusRepository.ts - Contrato de repositorio para Buses
 */

import type { Bus, BusAsiento } from "../Entities/Bus";

export interface BusFiltros {
	cooperativaId?: number;
	tipoAsiento?: "NORMAL" | "VIP";
	precioMinimo?: number;
	precioMaximo?: number;
	ordenarPor?: "precio" | "salida" | "cooperativa";
}

export interface IBusRepository {
	obtenerTodos(): Promise<Bus[]>;
	obtenerPorCooperativa(cooperativaId: number): Promise<Bus[]>;
	obtenerPorId(id: number): Promise<Bus | null>;
	obtenerPorPlaca(placa: string): Promise<Bus | null>;
	obtenerPorNumero(numero: string): Promise<Bus | null>;
	crear(bus: Bus): Promise<Bus>;
	actualizar(id: number, bus: Partial<Bus>): Promise<Bus>;
	eliminarLogico(id: number): Promise<void>;
	obtenerAsientos(busId: number): Promise<BusAsiento[]>;
	obtenerAsientosDisponibles(
		busId: number,
		tipo: "NORMAL" | "VIP",
	): Promise<BusAsiento[]>;
	actualizarAsiento(asiento: BusAsiento): Promise<BusAsiento>;
	reservarAsientos(asientos: BusAsiento[]): Promise<void>;
	liberarAsientos(asientos: BusAsiento[]): Promise<void>;
	buscarDisponibles(
		ciudadOrigen: string,
		ciudadDestino: string,
		fecha: Date,
		filtros?: BusFiltros,
	): Promise<Bus[]>;
	marcarFueraDeServicio(
		busId: number,
		motivo: string,
		descripcion?: string,
		replacementBusId?: number,
		reportadoPor?: string,
	): Promise<Bus>;
	obtenerRutasAfectadas(busId: number): Promise<number>;
}
