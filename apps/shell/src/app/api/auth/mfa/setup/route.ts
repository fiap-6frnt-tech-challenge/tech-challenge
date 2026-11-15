import { z } from 'zod';
import { container } from '@/server/container';
import { mfaMutation, mfaPassword } from '@/server/http/mfa';
export const POST = mfaMutation(z.strictObject({ password: mfaPassword }), (userId, data) =>
  container.mfa.setup(userId, data.password)
);
