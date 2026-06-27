import { redirect } from 'next/navigation';

// Consolidated into the single Approvals section (see /dashboard/approvals).
export default function LeaveApprovalsRedirect() {
  redirect('/dashboard/approvals?tab=leave');
}
