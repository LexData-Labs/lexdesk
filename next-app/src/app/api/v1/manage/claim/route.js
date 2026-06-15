import { makeManageGet } from '@/lib/mobileRequestRoutes';
import { getClaims } from '@/lib/services/claims';

export const dynamic = 'force-dynamic';

export const GET = makeManageGet(getClaims);
