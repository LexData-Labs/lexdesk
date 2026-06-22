import { makeAdminList } from '@/lib/webRequestRoutes';
import { getReconRequests } from '@/lib/services/recon';

export const dynamic = 'force-dynamic';

export const GET = makeAdminList(getReconRequests);
