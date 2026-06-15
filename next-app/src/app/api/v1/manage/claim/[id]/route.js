import { makeManageDecide } from '@/lib/mobileRequestRoutes';
import { decideClaim, getClaim } from '@/lib/services/claims';

export const dynamic = 'force-dynamic';

export const POST = makeManageDecide(getClaim, decideClaim);
