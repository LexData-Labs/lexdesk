import { NextResponse } from 'next/server';
import { getMobileUser, mobileAuthError, requireManager } from '@/lib/mobileAuth';
import { canManageUser } from '@/lib/services/teams';
import { getAssetRequests, decideAssetRequest } from '@/lib/services/assets';
import { isAdminRole } from '@/lib/mobileRequestRoutes';

export const dynamic = 'force-dynamic';

// Asset uses dual approval: an admin decides the 'admin' side, a team lead the
// 'lead' side. Overall status flips to approved only when both sides approve.
export async function POST(request, ctx) {
  let user;
  try { user = await getMobileUser(request); } catch (e) { return mobileAuthError(e); }
  try {
    await requireManager(user);
    const { id } = await ctx.params;
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
    const { requests } = await getAssetRequests({}, user.orgId);
    const row = requests.find((x) => String(x.id) === String(id));
    if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const ok = await canManageUser(user.orgId, user.uid, user.role, row.uid);
    if (!ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const side = isAdminRole(user.role) ? 'admin' : 'lead';
    const result = await decideAssetRequest(id, side, body?.decision, body?.note || undefined, user.orgId);
    return NextResponse.json(result);
  } catch (e) { return mobileAuthError(e); }
}
