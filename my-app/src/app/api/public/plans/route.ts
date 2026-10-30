import { NextResponse } from 'next/server';
import * as svc from '@/lib/services/plan.service';
import { handleApiError } from '@/lib/utils/apiResponse';

/**
 * PUBLIC endpoint — used by the marketing/pricing page to fetch plan data
 * dynamically (active plans only). NO auth required.
 */
// Ported from Express: router.get('/plans', planCtrl.listPublicPlans)  [public.routes.ts]
export const revalidate = 3600;

export async function GET() {
  try {
    const result = await svc.listPlans(true);
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
