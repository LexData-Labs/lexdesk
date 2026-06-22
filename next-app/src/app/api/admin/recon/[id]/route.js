import { makeAdminDecide } from '@/lib/webRequestRoutes';
import { decideRecon } from '@/lib/services/recon';

export const dynamic = 'force-dynamic';

export const POST = makeAdminDecide(decideRecon);
