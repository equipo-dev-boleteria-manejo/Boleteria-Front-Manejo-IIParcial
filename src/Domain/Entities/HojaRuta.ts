export interface HojaRuta {
  id?: string;
  rutaId: string;
  busId: string;
  conductorId?: string;
  fechaSalida: string; // Formato YYYY-MM-DD
  horaSalida: string;  // Formato HH:mm (Ej: "07:00")
  estado: 'PROGRAMADA' | 'EN_CURSO' | 'FINALIZADA' | 'CANCELADA';
  diasParada?: string[]; // Días de descanso o mantenimiento asignados al vehículo
  createdAt?: Date;
}