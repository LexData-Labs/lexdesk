import { makeManageDecide } from '@/lib/mobileRequestRoutes';
import { decideRecon, getRecon } from '@/lib/services/recon';

export const dynamic = 'force-dynamic';

export const POST = makeManageDecide(getRecon, decideRecon);
