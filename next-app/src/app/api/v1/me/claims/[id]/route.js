import { makeMineCancel } from '@/lib/mobileRequestRoutes';
import { cancelMyClaim } from '@/lib/services/claims';

export const dynamic = 'force-dynamic';

export const DELETE = makeMineCancel(cancelMyClaim);
