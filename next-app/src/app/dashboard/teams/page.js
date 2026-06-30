import { redirect } from 'next/navigation';

// Consolidated into the single People section (see /dashboard/people).
export default function TeamsRedirect() {
  redirect('/dashboard/people?tab=teams');
}
