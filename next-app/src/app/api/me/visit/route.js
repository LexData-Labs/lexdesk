import { makeMineGet, makeMinePost } from '@/lib/webRequestRoutes';
import { listMyVisits, submitVisit } from '@/lib/services/visits';

export const dynamic = 'force-dynamic';

export const GET = makeMineGet(listMyVisits);
export const POST = makeMinePost(submitVisit, ['fromDay', 'toDay', 'place', 'subject']);
