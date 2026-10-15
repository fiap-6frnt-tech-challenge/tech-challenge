export class UploadSessionEndedError extends Error {
  constructor() {
    super('A sessão de upload foi encerrada.');
    this.name = 'UploadSessionEndedError';
  }
}
