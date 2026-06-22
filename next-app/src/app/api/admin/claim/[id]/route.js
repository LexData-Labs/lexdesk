import { makeAdminDecide } from '@/lib/webRequestRoutes';
import { decideClaim } from '@/lib/services/claims';

export const dynamic = 'force-dynamic';

export const POST = makeAdminDecide(decideClaim);
