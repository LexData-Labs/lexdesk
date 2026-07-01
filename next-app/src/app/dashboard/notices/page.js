import { redirect } from 'next/navigation';

// Consolidated into the single Notices & Holidays section (see /dashboard/noticeboard).
export default function NoticesRedirect() {
  redirect('/dashboard/noticeboard?tab=notices');
}
