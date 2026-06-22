import { makeTeamDecide } from '@/lib/webRequestRoutes';
import { decideClaim, getClaim } from '@/lib/services/claims';

export const dynamic = 'force-dynamic';

export const POST = makeTeamDecide(getClaim, decideClaim);
