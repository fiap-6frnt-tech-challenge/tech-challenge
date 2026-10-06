import { container } from '@/server/container';
import { publicRoute } from '@/server/http/route';
import { readJson } from '../../read-json';

export const runtime = 'nodejs';

export const POST = publicRoute(
  async ({ req }) => {
    const user = await container.registerUser.execute(await readJson(req));
    return { id: user.id, name: user.name, email: user.email };
  },
  { status: 201 }
);
