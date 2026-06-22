import { makeTeamList } from '@/lib/webRequestRoutes';
import { getClaims } from '@/lib/services/claims';

export const dynamic = 'force-dynamic';

export const GET = makeTeamList(getClaims);
