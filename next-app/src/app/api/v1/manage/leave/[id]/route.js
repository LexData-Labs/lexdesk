import { makeManageDecide, getOneViaList } from '@/lib/mobileRequestRoutes';
import { getLeaveRequests, decideLeave } from '@/lib/services/leave';

export const dynamic = 'force-dynamic';

export const POST = makeManageDecide(getOneViaList(getLeaveRequests), decideLeave);
