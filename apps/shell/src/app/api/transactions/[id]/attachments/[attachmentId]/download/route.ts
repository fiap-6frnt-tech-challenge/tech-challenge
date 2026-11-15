import { container } from '@/server/container';
import { attachmentFileResponse } from '@/server/http/attachment';
import { route } from '@/server/http/route';

export const runtime = 'nodejs';
type Params = { id: string; attachmentId: string };

export const GET = route<Params>(async ({ actor, params }) =>
  attachmentFileResponse(
    await container.downloadAttachment.execute(actor, params.id, params.attachmentId)
  )
);
