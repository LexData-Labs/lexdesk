import { NextResponse } from 'next/server';
import { getMobileUser, mobileAuthError } from '@/lib/mobileAuth';
import { cancelMyLeaveRequest } from '@/lib/services/leave';

export const dynamic = 'force-dynamic';

// DELETE /api/v1/me/leave-requests/{id} — cancel the caller's own pending request.
export async function DELETE(request, ctx) {
  let user;
  try {
    user = await getMobileUser(request);
  } catch (e) {
    return mobileAuthError(e);
  }
  const { id } = await ctx.params;
  try {
    const result = await cancelMyLeaveRequest(user.orgId, user.uid, id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
