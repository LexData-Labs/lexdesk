import { makeMineGet } from '@/lib/mobileRequestRoutes';
import { listMyBreaks } from '@/lib/services/breaks';

export const dynamic = 'force-dynamic';

// GET /api/v1/me/breaks — { events, onBreak }
export const GET = makeMineGet(listMyBreaks);
