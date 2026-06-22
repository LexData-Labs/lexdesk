import { makeAdminDecide } from '@/lib/webRequestRoutes';
import { decideVisit } from '@/lib/services/visits';

export const dynamic = 'force-dynamic';

export const POST = makeAdminDecide(decideVisit);
