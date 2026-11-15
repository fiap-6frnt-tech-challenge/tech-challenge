import { container } from '@/server/container';
import { corsHeaders } from '@/server/http/cors';
import { publicRoute, route } from '@/server/http/route';

export const runtime = 'nodejs';
type Params = { id: string; attachmentId: string };
const cors = (req: Request) => corsHeaders(req.headers.get('origin'));

export const OPTIONS = publicRoute(async () => undefined, { headers: cors });

export const DELETE = route<Params>(
  async ({ actor, params }) => {
    await container.removeAttachment.execute(actor, params.attachmentId);
  },
  { headers: cors }
);
