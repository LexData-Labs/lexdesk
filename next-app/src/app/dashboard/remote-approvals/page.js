import { redirect } from 'next/navigation';

// Consolidated into the single Approvals section (see /dashboard/approvals).
export default function RemoteApprovalsRedirect() {
  redirect('/dashboard/approvals?tab=remote');
}
