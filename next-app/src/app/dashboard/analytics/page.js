import { redirect } from 'next/navigation';

// Analytics insight cards now live directly on the Dashboard (see /dashboard).
export default function AnalyticsRedirect() {
  redirect('/dashboard');
}
