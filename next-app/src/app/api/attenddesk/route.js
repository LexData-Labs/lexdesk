import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import * as attenddesk from '@/lib/attenddesk';

export const dynamic = 'force-dynamic';

// Server-side proxy to the AttendDesk external API. The adk_live_ key never
// leaves the server; the browser calls this gated route instead.
const RESOURCES = {
  me: () => attenddesk.getMe(),
  policy: () => attenddesk.getPolicy(),
  office: () => attenddesk.getOffice(),
  employees: () => attenddesk.getEmployees(),
  attendance: (sp) =>
    attenddesk.getAttendance({
      limit: sp.get('limit') ?? 50,
      from: sp.get('from'),
      to: sp.get('to'),
      userId: sp.get('userId'),
    }),
  leaveRequests: () => attenddesk.getLeaveRequests(),
};

export async function GET(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Org-wide data is admin-only; employees use the self-scoped /api/me/* routes.
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sp = new URL(request.url).searchParams;
  const run = RESOURCES[sp.get('resource') || 'me'];
  if (!run) return NextResponse.json({ error: 'unknown_resource' }, { status: 400 });

  try {
    return NextResponse.json(await run(sp));
  } catch (err) {
    return NextResponse.json(
      { error: err.message, upstream: err.body ?? null },
      { status: err.status || 502 },
    );
  }
}
