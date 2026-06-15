import { makeMineCancel } from '@/lib/mobileRequestRoutes';
import { cancelMyVisit } from '@/lib/services/visits';

export const dynamic = 'force-dynamic';

export const DELETE = makeMineCancel(cancelMyVisit);
