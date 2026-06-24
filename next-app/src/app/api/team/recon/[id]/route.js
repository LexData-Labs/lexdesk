import { makeTeamDecide } from '@/lib/webRequestRoutes';
import { decideRecon, getRecon } from '@/lib/services/recon';

export const dynamic = 'force-dynamic';

export const POST = makeTeamDecide(getRecon, decideRecon);
