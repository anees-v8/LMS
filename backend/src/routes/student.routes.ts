import { Router } from 'express';
import * as ctrl from '../controllers/student.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { validate } from '../middleware/validate.js';
import {
  idParamSchema,
  paymentIdParamSchema,
  subjectIdParamSchema,
  chapterIdParamSchema,
  testIdParamSchema,
  listVideosQuerySchema,
  askDoubtQuerySchema,
  submitTestSchema,
  scanAttendanceQrSchema,
} from '../validators/student.validators.js';

const router = Router();
router.use(authMiddleware, roleGuard('student'));

/* ── Dashboard ──────────────────────────────────────────────────────────── */
router.get('/dashboard', ctrl.dashboard);
router.post('/progress', ctrl.updateProgress);

/* ── Learn ──────────────────────────────────────────────────────────────── */
router.get('/subjects', ctrl.listSubjects);
router.get('/subjects/:subjectId/chapters', validate(subjectIdParamSchema, 'params'), ctrl.listChapters);
router.get('/chapters/:chapterId/content', validate(chapterIdParamSchema, 'params'), ctrl.listChapterContent);

/* ── Videos (legacy) ────────────────────────────────────────────────────── */
router.get('/videos', validate(listVideosQuerySchema, 'query'), ctrl.listVideos);
router.get('/videos/:id', validate(idParamSchema, 'params'), ctrl.videoDetail);

/* ── Live Classes ───────────────────────────────────────────────────────── */
router.get('/live/today', ctrl.todayLive);
router.get('/live/upcoming', ctrl.upcomingLive);

/* ── Tests & Quiz ───────────────────────────────────────────────────────── */
router.get('/tests', ctrl.listTests);
router.get('/tests/:testId/questions', validate(testIdParamSchema, 'params'), ctrl.getTestQuestions);
router.post('/tests/:testId/submit', validate(testIdParamSchema, 'params'), validate(submitTestSchema, 'body'), ctrl.submitTest);

/* ── Fees ───────────────────────────────────────────────────────────────── */
router.get('/fees', ctrl.fees);
router.post('/fees/create-order', ctrl.createFeeOrder);
router.post('/fees/verify', ctrl.verifyFeePayment);
router.get('/fees/receipt/:paymentId', validate(paymentIdParamSchema, 'params'), ctrl.receipt);

/* ── Profile Analytics ──────────────────────────────────────────────────── */
router.get('/profile', ctrl.getProfile);
router.get('/attendance/monthly', ctrl.monthlyAttendance);
router.post('/attendance/qr-scan', validate(scanAttendanceQrSchema), ctrl.scanAttendanceQr);
router.get('/performance', ctrl.subjectPerformance);

/* ── Misc ───────────────────────────────────────────────────────────────── */
router.get('/ask-doubt', validate(askDoubtQuerySchema, 'query'), ctrl.askDoubt);
router.get('/notifications', ctrl.listNotifications);
router.get('/notifications/unread-count', ctrl.unreadNotificationCount);
router.patch('/notifications/:id/read', validate(idParamSchema, 'params'), ctrl.markNotificationRead);

export default router;

