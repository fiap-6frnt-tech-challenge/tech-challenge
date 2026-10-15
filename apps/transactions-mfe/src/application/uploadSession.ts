import { ClientSessionEndedError } from '@bytebank/stores';

export class UploadSessionEndedError extends ClientSessionEndedError {
  constructor() {
    super();
    this.name = 'UploadSessionEndedError';
  }
}
