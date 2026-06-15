import { makeManageGet } from '@/lib/mobileRequestRoutes';
import { getReconRequests } from '@/lib/services/recon';

export const dynamic = 'force-dynamic';

export const GET = makeManageGet(getReconRequests);
