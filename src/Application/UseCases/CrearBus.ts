import { Bus, type EstructuraBus } from "../../Domain/Entities/Bus";
import {
	BusInvalidoException,
	PlacaDuplicadaException,
} from "../../Domain/Exceptions/BusException";
import type { IBusRepository } from "../../Domain/Repositories/IBusRepository";

export interface CrearBusInput {
	cooperativaId: number;
	numero: string;
	placa: string;
	totalAsientos: number;
	estructura?: EstructuraBus;
	marcaChasis?: string;
	marcaCarroceria?: string;
	anio?: number;
	fotoUrl?: string;
}

export class CrearBus {
	constructor(private busRepo: IBusRepository) {}

	async ejecutar(input: CrearBusInput): Promise<Bus> {
		const { cooperativaId, numero, placa, totalAsientos } = input;
		const nuevoBus = new Bus(cooperativaId, numero, placa, totalAsientos);

		if (!nuevoBus.esValido()) {
			throw new BusInvalidoException(
				"Los datos del autobús no son válidos. Verifique el número, la placa y que la capacidad sea mayor a cero.",
			);
		}

		const busExistente = await this.busRepo.obtenerPorPlaca(placa);
		if (busExistente) {
			throw new PlacaDuplicadaException(placa);
		}

		if (input.estructura) nuevoBus.estructura = input.estructura;
		if (input.marcaChasis) nuevoBus.marcaChasis = input.marcaChasis;
		if (input.marcaCarroceria) nuevoBus.marcaCarroceria = input.marcaCarroceria;
		if (input.anio) nuevoBus.anio = input.anio;
		if (input.fotoUrl) nuevoBus.fotoUrl = input.fotoUrl;

		return this.busRepo.crear(nuevoBus);
	}
}