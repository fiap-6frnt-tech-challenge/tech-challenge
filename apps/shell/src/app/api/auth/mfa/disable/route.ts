import { z } from 'zod';
import { container } from '@/server/container';
import { mfaCode, mfaMutation, mfaPassword } from '@/server/http/mfa';
export const POST = mfaMutation(
  z.strictObject({ password: mfaPassword, code: mfaCode }),
  (userId, data) => container.mfa.disable(userId, data.password, data.code)
);
