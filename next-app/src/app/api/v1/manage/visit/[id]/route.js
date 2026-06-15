import { makeManageDecide } from '@/lib/mobileRequestRoutes';
import { decideVisit, getVisit } from '@/lib/services/visits';

export const dynamic = 'force-dynamic';

export const POST = makeManageDecide(getVisit, decideVisit);
