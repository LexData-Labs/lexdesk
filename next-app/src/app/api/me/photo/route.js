import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { uploadPhoto } from '@/lib/attenddesk';

export const dynamic = 'force-dynamic';

// Upload the signed-in user's own profile photo to AttendDesk (Firebase Storage).
// Email comes from the verified token, so a user can only set their own photo.
export async function POST(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.email) return NextResponse.json({ error: 'no_email_on_account' }, { status: 400 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const dataUrl = body?.dataUrl;
  if (!dataUrl || !/^data:image\//i.test(dataUrl)) {
    return NextResponse.json({ error: 'A valid image is required' }, { status: 400 });
  }

  try {
    const data = await uploadPhoto(user.email, dataUrl, user.orgId);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message, upstream: err.body ?? null }, { status: err.status || 502 });
  }
}
