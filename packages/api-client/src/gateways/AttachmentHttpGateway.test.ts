import { describe, expect, it } from 'vitest';
import { AjaxError, type AjaxRequest } from 'rxjs/ajax';
import { AttachmentHttpGateway, isTransientUploadError } from './AttachmentHttpGateway';

class FakeEventTarget {
  private listeners = new Map<string, Array<(event: ProgressEvent) => void>>();

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const callback =
      typeof listener === 'function' ? listener : (event: Event) => listener.handleEvent(event);
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(callback as (event: ProgressEvent) => void);
    this.listeners.set(type, listeners);
  }

  dispatch(type: string, event: ProgressEvent): void {
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }
}

class FakeXhr extends FakeEventTarget {
  readonly upload = new FakeEventTarget();
  readyState = 1;
  status = 200;
  responseType: XMLHttpRequestResponseType = '';
  response: unknown = {
    id: 'att-1',
    url: '/attachments/att-1',
    name: 'receipt.pdf',
    size: 12,
    mimeType: 'application/pdf',
  };
  responseText = '';
  timeout = 0;
  withCredentials = false;
  url = '';
  method = '';
  body: Document | XMLHttpRequestBodyInit | null | undefined;
  abortCount = 0;

  open(method: string, url: string): void {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(): void {}

  send(body?: Document | XMLHttpRequestBodyInit | null): void {
    this.body = body;
  }

  abort(): void {
    this.abortCount += 1;
    this.dispatch('abort', { type: 'abort', loaded: 0, total: 0 } as ProgressEvent);
  }

  getAllResponseHeaders(): string {
    return 'content-type: application/json\n';
  }
}

function progressEvent(type: string, loaded: number, total: number): ProgressEvent {
  return { type, loaded, total } as ProgressEvent;
}

describe('AttachmentHttpGateway.upload$', () => {
  it('emits upload progress and the response while posting multipart data to the configured API URL', () => {
    const xhr = new FakeXhr();
    const gateway = new AttachmentHttpGateway(() => xhr as unknown as XMLHttpRequest);
    const file = new File(['%PDF-1.4'], 'receipt.pdf', { type: 'application/pdf' });
    const events: unknown[] = [];

    gateway.upload$('tx 1', file).subscribe((event) => events.push(event));
    xhr.upload.dispatch('progress', progressEvent('progress', 50, 100));
    xhr.readyState = 4;
    xhr.dispatch('load', progressEvent('load', 0, 0));

    expect(xhr.method).toBe('POST');
    expect(xhr.url).toBe('/api/transactions/tx%201/attachments');
    expect(xhr.body).toBeInstanceOf(FormData);
    expect((xhr.body as FormData).get('file')).toBeInstanceOf(File);
    expect(events).toEqual([
      { type: 'progress', loaded: 50, total: 100 },
      {
        type: 'done',
        attachment: {
          id: 'att-1',
          url: '/attachments/att-1',
          name: 'receipt.pdf',
          size: 12,
          mimeType: 'application/pdf',
        },
      },
    ]);
  });

  it('aborts the underlying XHR when unsubscribed', () => {
    const xhr = new FakeXhr();
    const gateway = new AttachmentHttpGateway(() => xhr as unknown as XMLHttpRequest);
    const subscription = gateway.upload$('tx-1', new File(['x'], 'receipt.pdf')).subscribe();

    subscription.unsubscribe();

    expect(xhr.abortCount).toBe(1);
  });
});

describe('isTransientUploadError', () => {
  const errorWithStatus = (status: number) =>
    new AjaxError('upload failed', { status } as XMLHttpRequest, {} as AjaxRequest);

  it.each([0, 500, 503])('retries network and server errors (status %s)', (status) => {
    expect(isTransientUploadError(errorWithStatus(status))).toBe(true);
  });

  it.each([400, 413])('does not retry client errors (status %s)', (status) => {
    expect(isTransientUploadError(errorWithStatus(status))).toBe(false);
  });

  it('does not treat a non-Ajax error as transient', () => {
    expect(isTransientUploadError(new Error('plain-text platform response'))).toBe(false);
  });
});
