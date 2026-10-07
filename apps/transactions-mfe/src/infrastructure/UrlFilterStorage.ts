export interface FilterStateStorage {
  read(): URLSearchParams;
  write(params: URLSearchParams): void;
  subscribe(callback: () => void): () => void;
}

export class UrlFilterStorage implements FilterStateStorage {
  read(): URLSearchParams {
    return new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
  }

  write(params: URLSearchParams): void {
    if (typeof window === 'undefined') return;
    const query = params.toString();
    const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState(window.history.state, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  subscribe(callback: () => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    window.addEventListener('popstate', callback);
    return () => window.removeEventListener('popstate', callback);
  }
}
