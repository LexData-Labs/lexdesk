import { makeManageDecide } from '@/lib/mobileRequestRoutes';
import { decideRemote, getRemote } from '@/lib/services/remote';

export const dynamic = 'force-dynamic';

export const POST = makeManageDecide(getRemote, decideRemote);
