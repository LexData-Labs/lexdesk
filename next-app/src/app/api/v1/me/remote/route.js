import { makeMineGet, makeMinePost } from '@/lib/mobileRequestRoutes';
import { listMyRemote, submitRemote } from '@/lib/services/remote';

export const dynamic = 'force-dynamic';

export const GET = makeMineGet(listMyRemote);
export const POST = makeMinePost(submitRemote, ['day', 'reason']);
