import type { Request, Response } from 'express';
import * as svc from '../services/student.service.js';
import * as notificationCenter from '../services/notificationCenter.service.js';
import * as rzpSvc from '../services/razorpay.service.js';
import * as adminSvc from '../services/admin.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { tenantId, userId } from './helpers.js';

export const dashboard = asyncHandler(async (req: Request, res: Response) =>
  res.json(await svc.dashboard(tenantId(req), userId(req)))
);

export const listVideos = asyncHandler(async (req: Request, res: Response) =>
  res.json(
    await svc.listVideos(tenantId(req), userId(req), req.query.subjectId ? Number(req.query.subjectId) : null)
  )
);

export const videoDetail = asyncHandler(async (req: Request, res: Response) =>
  res.json(await svc.videoDetail(tenantId(req), userId(req), Number(req.params.id)))
);

export const todayLive = asyncHandler(async (req: Request, res: Response) =>
  res.json(await svc.todayLive(tenantId(req), userId(req)))
);

export const upcomingLive = asyncHandler(async (req: Request, res: Response) =>
  res.json(await svc.upcomingLive(tenantId(req), userId(req)))
);

export const fees = asyncHandler(async (req: Request, res: Response) =>
  res.json(await svc.fees(tenantId(req), userId(req)))
);

export const createFeeOrder = asyncHandler(async (req: Request, res: Response) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) throw ApiError.badRequest('INVALID_AMOUNT', 'Invalid fee amount');
  const student = await svc.getProfile(tenantId(req), userId(req));
  res.json(await rzpSvc.createFeeOrder(tenantId(req), student.studentId, amount));
});

export const verifyFeePayment = asyncHandler(async (req: Request, res: Response) => {
  const { orderId, paymentId, signature, amount, feeStructureId } = req.body;
  const student = await svc.getProfile(tenantId(req), userId(req));
  
  // Verify signature
  await rzpSvc.verifyFeePayment(tenantId(req), student.studentId, { orderId, paymentId, signature }, amount, feeStructureId);
  
  // Record payment in database
  const result = await adminSvc.recordPayment(tenantId(req), userId(req), {
    studentId: student.studentId,
    feeStructureId: feeStructureId || undefined,
    amountPaid: amount,
    method: 'upi'
  });
  
  res.json(result);
});

export const receipt = asyncHandler(async (req: Request, res: Response) =>
  res.json(await svc.receipt(tenantId(req), userId(req), Number(req.params.paymentId)))
);

export const askDoubt = asyncHandler(async (req: Request, res: Response) => {
  const chapter = typeof req.query.chapter === 'string' ? req.query.chapter : undefined;
  res.json(await svc.askDoubt(tenantId(req), userId(req), Number(req.query.teacherId), chapter));
});

/* Notifications */
export const listNotifications = asyncHandler(async (req: Request, res: Response) =>
  res.json(await notificationCenter.listMyNotifications(userId(req)))
);
export const unreadNotificationCount = asyncHandler(async (req: Request, res: Response) =>
  res.json({ count: await notificationCenter.unreadNotificationCount(userId(req)) })
);
export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  await notificationCenter.markNotificationRead(Number(req.params.id), userId(req));
  res.json({ success: true });
});

/* Learn — Subjects */
export const listSubjects = asyncHandler(async (req: Request, res: Response) =>
  res.json(await svc.listSubjects(tenantId(req), userId(req)))
);

/* Learn — Chapters */
export const listChapters = asyncHandler(async (req: Request, res: Response) =>
  res.json(await svc.listChapters(tenantId(req), userId(req), Number(req.params.subjectId)))
);

/* Learn — Chapter Content */
export const listChapterContent = asyncHandler(async (req: Request, res: Response) =>
  res.json(await svc.listChapterContent(tenantId(req), userId(req), Number(req.params.chapterId)))
);

/* Tests */
export const listTests = asyncHandler(async (req: Request, res: Response) =>
  res.json(await svc.listTests(tenantId(req), userId(req)))
);

export const getTestQuestions = asyncHandler(async (req: Request, res: Response) =>
  res.json(await svc.getTestQuestions(tenantId(req), userId(req), Number(req.params.testId)))
);

export const submitTest = asyncHandler(async (req: Request, res: Response) =>
  res.json(await svc.submitTest(tenantId(req), userId(req), Number(req.params.testId), req.body))
);

/* Profile — Attendance Monthly */
export const monthlyAttendance = asyncHandler(async (req: Request, res: Response) =>
  res.json(await svc.monthlyAttendance(tenantId(req), userId(req)))
);

export const scanAttendanceQr = asyncHandler(async (req: Request, res: Response) =>
  res.json(await svc.scanAttendanceQr(tenantId(req), userId(req), req.body.token))
);

/* Profile — Performance */
export const subjectPerformance = asyncHandler(async (req: Request, res: Response) =>
  res.json(await svc.subjectPerformance(tenantId(req), userId(req)))
);

/* Student Profile (detailed) */
export const getProfile = asyncHandler(async (req: Request, res: Response) =>
  res.json(await svc.getProfile(tenantId(req), userId(req)))
);

export const updateProgress = asyncHandler(async (req: Request, res: Response) => {
  const { contentId, progressSeconds } = req.body;
  if (!contentId || progressSeconds == null) throw ApiError.badRequest('Missing contentId or progressSeconds');
  await svc.updateProgress(tenantId(req), userId(req), Number(contentId), Number(progressSeconds));
  res.json({ success: true });
});
