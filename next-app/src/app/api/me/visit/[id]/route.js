import { makeMineCancel } from '@/lib/webRequestRoutes';
import { cancelMyVisit } from '@/lib/services/visits';

export const dynamic = 'force-dynamic';

export const DELETE = makeMineCancel(cancelMyVisit);
