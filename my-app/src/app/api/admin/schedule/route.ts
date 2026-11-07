import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/lib/services/admin.service';
import { requireAuth, requireTenantId } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/utils/apiResponse';

// Read-only, institute-wide weekly schedule across every batch, each slot
// joined to its assigned teacher (if any). Replaces GET /api/admin/timetable
// for display purposes — writes go through /admin/batches/:id/schedule
// (full-replace, per-batch) and /admin/teacher-assignments, which run the
// clash checks this read-only view does not.
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const tenantId = requireTenantId(user);
    const result = await svc.listInstituteSchedule(tenantId);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
