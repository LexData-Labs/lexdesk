import { makeManageGet } from '@/lib/mobileRequestRoutes';
import { getLeaveRequests } from '@/lib/services/leave';

export const dynamic = 'force-dynamic';

export const GET = makeManageGet(getLeaveRequests);
