export interface FilterStateStorage {
  read(): URLSearchParams;
  write(params: URLSearchParams): void;
  subscribe(callback: () => void): () => void;
}
