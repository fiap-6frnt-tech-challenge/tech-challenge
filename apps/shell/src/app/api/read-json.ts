const MAX_JSON_BODY_BYTES = 16 * 1024;

export class JsonRequestError extends Error {
  constructor(
    public readonly status: 400 | 413,
    message: string
  ) {
    super(message);
  }
}

export async function readJson(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get('content-length'));
  if (declaredLength > MAX_JSON_BODY_BYTES) {
    throw new JsonRequestError(413, 'Corpo muito grande');
  }

  const reader = request.body?.getReader();
  if (!reader) throw new JsonRequestError(400, 'JSON inválido');

  const decoder = new TextDecoder();
  let text = '';
  let bytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_JSON_BODY_BYTES) {
      void reader.cancel().catch(() => undefined);
      throw new JsonRequestError(413, 'Corpo muito grande');
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new JsonRequestError(400, 'JSON inválido');
  }
}
