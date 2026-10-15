export interface Ruta {
  id?: string;
  origen: string;
  destino: string;
  paradasIntermedias?: string[]; // Ejemplo: ["Latacunga", "Riobamba", "Cuenca"]
  distanciaKm?: number;
  tiempoEstimadoMin?: number;
  estado: boolean; // true = Activa, false = Inactiva
  createdAt?: Date;
}