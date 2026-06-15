import { makeManageGet } from '@/lib/mobileRequestRoutes';
import { getRemoteRequests } from '@/lib/services/remote';

export const dynamic = 'force-dynamic';

export const GET = makeManageGet(getRemoteRequests);
