import { NextResponse } from 'next/server';
import { getUserFromRequest, findUserById, deleteUserById, canDeleteUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Remove an account. Super admin may remove admins/employees; admin may remove
// employees only. Superadmins and your own account can never be removed.
export async function DELETE(request, ctx) {
  const actor = getUserFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const target = findUserById(id);
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (!canDeleteUser(actor, target)) {
    return NextResponse.json({ error: 'You are not allowed to remove this user' }, { status: 403 });
  }

  deleteUserById(id);
  return NextResponse.json({ success: true });
}
