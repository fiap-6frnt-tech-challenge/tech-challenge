import { NotFoundError } from '@bytebank/core';
import { container } from '@/server/container';
import { publicAttachment } from '@/server/http/attachment';
import { corsHeaders } from '@/server/http/cors';
import { publicRoute, route } from '@/server/http/route';
import { readUpload } from '@/server/http/upload';

export const runtime = 'nodejs';
type Params = { id: string };
const cors = (req: Request) => corsHeaders(req.headers.get('origin'));

export const OPTIONS = publicRoute(async () => undefined, { headers: cors });

export const POST = route<Params>(
  async ({ actor, req, params }) => {
    await container.getTransaction.execute(actor, params.id);
    const file = await readUpload(req);
    const attachment = await container.addAttachment.execute(actor, params.id, file);
    return publicAttachment(attachment);
  },
  { status: 201, headers: cors }
);

export const GET = route<Params>(
  async ({ actor, params }) => {
    try {
      return (await container.listAttachments.execute(actor, params.id)).map(publicAttachment);
    } catch (error) {
      if (error instanceof NotFoundError) return [];
      throw error;
    }
  },
  { headers: cors }
);
