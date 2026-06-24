import { makeMineGet, makeMinePost } from '@/lib/webRequestRoutes';
import { listMyRecon, submitRecon } from '@/lib/services/recon';

export const dynamic = 'force-dynamic';

export const GET = makeMineGet(listMyRecon);
export const POST = makeMinePost(submitRecon, ['day', 'reason']);
