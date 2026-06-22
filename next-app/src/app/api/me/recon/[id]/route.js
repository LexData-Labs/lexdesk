import { makeMineCancel } from '@/lib/webRequestRoutes';
import { cancelMyRecon } from '@/lib/services/recon';

export const dynamic = 'force-dynamic';

export const DELETE = makeMineCancel(cancelMyRecon);
