// Clase base para todas tus excepciones
export class DomainException extends Error {
  constructor(public message: string, public code: string = 'DOMAIN_ERROR') {
    super(message);
    this.name = 'DomainException';
  }
}

