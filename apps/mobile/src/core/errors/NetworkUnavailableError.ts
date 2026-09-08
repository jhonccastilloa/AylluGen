export class NetworkUnavailableError extends Error {
  constructor(message = 'No internet connection available') {
    super(message);
    this.name = 'NetworkUnavailableError';
  }
}

