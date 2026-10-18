export class Bus {
	public id?: number;
	public marcaChasis?: string;
	public marcaCarroceria?: string;
	public anio?: number;
	public fotoUrl?: string;
	public createdAt?: Date;
	public asientosNormales?: BusAsiento[];
	public asientosVip?: BusAsiento[];
	public estructura?: string = "UnPiso";

	constructor(
		public cooperativaId: number,
		public numero: string,
		public placa: string,
		public totalAsientos: number,
		public estado: string = "Activo",
	) {}

	esValido(): boolean {
		return (
			this.numero.length > 0 &&
			this.placa.length >= 6 &&
			this.cooperativaId > 0 &&
			this.totalAsientos > 0
		);
	}

	desactivar(): void {
		this.estado = "Inactivo";
	}

	activar(): void {
		this.estado = "Activo";
	}
}

export class BusAsiento {
	public id?: number;
	public fila?: string;
	public columna?: string;
	public disponible: boolean = true;
	public pasajeroId?: string;
	public createdAt?: Date;
	public updatedAt?: Date;

	constructor(
		public busId: number,
		public configuracionId: number,
		public numeroAsiento: string,
		public tipo: string,
	) {}

	ocupar(pasajeroId: string): void {
		this.disponible = false;
		this.pasajeroId = pasajeroId;
		this.updatedAt = new Date();
	}

	liberar(): void {
		this.disponible = true;
		this.pasajeroId = undefined;
		this.updatedAt = new Date();
	}

	estaDisponible(): boolean {
		return this.disponible;
	}
}
