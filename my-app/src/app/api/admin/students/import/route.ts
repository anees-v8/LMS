import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import * as svc from '@/lib/services/admin.service';
import { requireAuth, requireTenantId } from '@/lib/middleware/auth';
import { requireActiveSubscription } from '@/lib/middleware/subscriptionGuard';
import ApiError from '@/lib/utils/ApiError';
import { handleApiError } from '@/lib/utils/apiResponse';

const MAX_ROWS = 1000;

// New: bulk student import from an uploaded spreadsheet (.xlsx/.xls/.csv),
// matching the columns in GET /admin/students/import-sample.
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const tenantId = requireTenantId(user);
    await requireActiveSubscription(tenantId);

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      throw ApiError.badRequest('FILE_REQUIRED', 'Upload a file under the "file" field');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    if (raw.length === 0) {
      throw ApiError.badRequest('EMPTY_FILE', 'No rows found in the uploaded file');
    }
    if (raw.length > MAX_ROWS) {
      throw ApiError.badRequest('TOO_MANY_ROWS', `File has ${raw.length} rows; the limit is ${MAX_ROWS} per import`);
    }

    const str = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim());
    const rows: svc.ImportStudentRow[] = raw.map((r) => ({
      fullName: str(r['Full Name']),
      phone: str(r['Phone']),
      password: str(r['Password']),
      parentName: str(r['Parent Name']) || undefined,
      parentPhone: str(r['Parent Phone']),
      grade: str(r['Grade']) || undefined,
      rollNo: str(r['Roll No']) || undefined,
      batchName: str(r['Batch Name']),
    }));

    const result = await svc.importStudents(tenantId, user.userId, rows);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
