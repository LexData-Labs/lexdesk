import { makeMineGet, makeMinePost } from '@/lib/webRequestRoutes';
import { listMyClaims, submitClaim } from '@/lib/services/claims';

export const dynamic = 'force-dynamic';

export const GET = makeMineGet(listMyClaims);
export const POST = makeMinePost(submitClaim, ['subject', 'amount', 'day']);
