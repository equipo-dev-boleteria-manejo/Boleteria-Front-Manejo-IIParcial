/**
 * SignUpDto.ts - DTO para registro de nuevos usuarios en el sistema
 */

import { RolUsuario } from '../../Domain/Constants/EstadosSistema';

export interface SignUpDto {
  email: string;
  password: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  rol?: RolUsuario;
  cooperativaId?: number | null;
}
