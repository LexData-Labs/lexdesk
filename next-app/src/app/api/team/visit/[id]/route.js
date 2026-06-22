import { makeTeamDecide } from '@/lib/webRequestRoutes';
import { decideVisit, getVisit } from '@/lib/services/visits';

export const dynamic = 'force-dynamic';

export const POST = makeTeamDecide(getVisit, decideVisit);
