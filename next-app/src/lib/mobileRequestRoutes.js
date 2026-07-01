import { NextResponse } from 'next/server';
import { getMobileUser, mobileAuthError, requireManager } from './mobileAuth';
import { listLedTeamMemberUids, canManageUser } from './services/teams';

// Factory handlers shared by every /api/v1 request-module route, so each
// route.js is two lines. Employee side forces userId from the token; manager
// side gates with requireManager + scopes team leads to their own members.

function isAdminRole(role) {
  const r = String(role ?? '').toUpperCase();
  return r === 'ADMIN' || r === 'SUPER_ADMIN' || r === 'SUPERADMIN' || r === 'DEV';
}

// GET /api/v1/me/{module} — the caller's own requests.
export function makeMineGet(listMineFn) {
  return async (request) => {
    let user;
    try { user = await getMobileUser(request); } catch (e) { return mobileAuthError(e); }
    try { return NextResponse.json(await listMineFn(user.orgId, user.uid)); }
    catch (e) { return NextResponse.json({ error: e.message }, { status: e.status || 500 }); }
  };
}

// POST /api/v1/me/{module} — submit one for the caller (userId forced from token).
export function makeMinePost(submitFn, required = []) {
  return async (request) => {
    let user;
    try { user = await getMobileUser(request); } catch (e) { return mobileAuthError(e); }
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
    for (const f of required) {
      const v = body?.[f];
      if (v === undefined || v === null || v === '') {
        return NextResponse.json({ error: `${f}_required` }, { status: 400 });
      }
    }
    try { return NextResponse.json(await submitFn({ ...body, userId: user.uid }, user.orgId), { status: 201 }); }
    catch (e) { return NextResponse.json({ error: e.message }, { status: e.status || 500 }); }
  };
}

// DELETE /api/v1/me/{module}/{id} — cancel the caller's own pending request.
export function makeMineCancel(cancelFn) {
  return async (request, ctx) => {
    let user;
    try { user = await getMobileUser(request); } catch (e) { return mobileAuthError(e); }
    const { id } = await ctx.params;
    try { return NextResponse.json(await cancelFn(user.orgId, user.uid, id)); }
    catch (e) { return NextResponse.json({ error: e.message }, { status: e.status || 500 }); }
  };
}

// GET /api/v1/manage/{module} — pending requests the manager may act on.
// Admin → org-wide; team lead → only their team members'.
export function makeManageGet(listFn) {
  return async (request) => {
    let user;
    try { user = await getMobileUser(request); } catch (e) { return mobileAuthError(e); }
    try {
      await requireManager(user);
      const status = new URL(request.url).searchParams.get('status') || undefined;
      const { requests } = await listFn(status ? { status } : {}, user.orgId);
      if (isAdminRole(user.role)) return NextResponse.json({ requests, scope: 'admin' });
      const { memberUids } = await listLedTeamMemberUids(user.orgId, user.uid);
      return NextResponse.json({ requests: requests.filter((x) => memberUids.has(String(x.uid))), scope: 'lead' });
    } catch (e) { return mobileAuthError(e); }
  };
}

// POST /api/v1/manage/{module}/{id} — decide. getOneFn fetches the row so we can
// verify the manager is allowed to act on that owner.
export function makeManageDecide(getOneFn, decideFn) {
  return async (request, ctx) => {
    let user;
    try { user = await getMobileUser(request); } catch (e) { return mobileAuthError(e); }
    try {
      await requireManager(user);
      const { id } = await ctx.params;
      let body;
      try { body = await request.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
      const row = await getOneFn(user.orgId, id);
      if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      const ok = await canManageUser(user.orgId, user.uid, user.role, row.uid);
      if (!ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      return NextResponse.json(await decideFn(id, body?.decision, body?.note || undefined, user.orgId, user.uid));
    } catch (e) { return mobileAuthError(e); }
  };
}

// Helper: a getOne for services that only expose a list (leave, asset).
export function getOneViaList(listFn) {
  return async (orgId, id) => {
    const { requests } = await listFn({}, orgId);
    return requests.find((x) => String(x.id) === String(id)) || null;
  };
}

export { isAdminRole };
