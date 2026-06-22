import { makeAdminList } from '@/lib/webRequestRoutes';
import { getVisits } from '@/lib/services/visits';

export const dynamic = 'force-dynamic';

export const GET = makeAdminList(getVisits);
