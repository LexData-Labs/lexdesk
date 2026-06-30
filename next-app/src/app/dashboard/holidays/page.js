import { redirect } from 'next/navigation';

// Consolidated into the single Notices & Holidays section (see /dashboard/noticeboard).
export default function HolidaysRedirect() {
  redirect('/dashboard/noticeboard?tab=holidays');
}
