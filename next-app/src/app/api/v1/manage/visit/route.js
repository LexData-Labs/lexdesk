import { makeManageGet } from '@/lib/mobileRequestRoutes';
import { getVisits } from '@/lib/services/visits';

export const dynamic = 'force-dynamic';

export const GET = makeManageGet(getVisits);
