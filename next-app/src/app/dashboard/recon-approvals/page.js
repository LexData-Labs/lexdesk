import { redirect } from 'next/navigation';

// Consolidated into the single Approvals section (see /dashboard/approvals).
export default function ReconApprovalsRedirect() {
  redirect('/dashboard/approvals?tab=recon');
}
