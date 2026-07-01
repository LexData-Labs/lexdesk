import { redirect } from 'next/navigation';

// Consolidated into the single Approvals section (see /dashboard/approvals).
export default function AssetApprovalsRedirect() {
  redirect('/dashboard/approvals?tab=asset');
}
