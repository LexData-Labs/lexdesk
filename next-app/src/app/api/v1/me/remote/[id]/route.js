import { makeMineCancel } from '@/lib/mobileRequestRoutes';
import { cancelMyRemote } from '@/lib/services/remote';

export const dynamic = 'force-dynamic';

export const DELETE = makeMineCancel(cancelMyRemote);
