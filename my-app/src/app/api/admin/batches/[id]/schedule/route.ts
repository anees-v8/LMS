import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/lib/services/admin.service';
import { requireAuth, requireTenantId } from '@/lib/middleware/auth';
import { validateBody } from '@/lib/middleware/validate';
import { setBatchScheduleSchema, idParamSchema } from '@/lib/validators/admin.validators';
import { handleApiError } from '@/lib/utils/apiResponse';

// Replaces GET /api/admin/timetable?batchId=... — a batch's own weekly schedule template.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const { id } = validateBody(idParamSchema, await params);
    const result = await svc.getBatchSchedule(requireTenantId(user), id);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

// Replaces POST /api/admin/timetable. Full-replace semantics: the request
// body is the batch's entire weekly schedule, not one row to append — see
// admin.service.ts's setBatchSchedule doc comment.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const { id } = validateBody(idParamSchema, await params);
    const { scheduleEntries } = validateBody(setBatchScheduleSchema, await req.json());
    const result = await svc.setBatchSchedule(requireTenantId(user), id, scheduleEntries);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
