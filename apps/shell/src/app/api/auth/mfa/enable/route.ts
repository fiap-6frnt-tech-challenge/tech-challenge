import { z } from 'zod';
import { NextResponse } from 'next/server';
import { container } from '@/server/container';
import { mfaCode, mfaMutation } from '@/server/http/mfa';
export const POST = mfaMutation(z.strictObject({ code: mfaCode }), async (userId, data) => {
  const result = await container.mfa.enable(userId, data.code);
  return NextResponse.json({ recoveryCodes: result.recoveryCodes });
});
