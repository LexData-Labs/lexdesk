import { redirect } from 'next/navigation';

// Consolidated into the single People section (see /dashboard/people).
export default function EmployeesRedirect() {
  redirect('/dashboard/people?tab=employees');
}
