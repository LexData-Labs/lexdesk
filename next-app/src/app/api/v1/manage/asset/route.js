import { makeManageGet } from '@/lib/mobileRequestRoutes';
import { getAssetRequests } from '@/lib/services/assets';

export const dynamic = 'force-dynamic';

export const GET = makeManageGet(getAssetRequests);
