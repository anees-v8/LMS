import { Router } from 'express';
import * as ctrl from '../controllers/teacher.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { featureGuard } from '../middleware/featureGuard.js';
import { validate } from '../middleware/validate.js';
import {
  idParamSchema,
  connectGoogleSchema,
  markAttendanceSchema,
  createQrSessionSchema,
  qrSessionIdParamSchema,
  createContentSchema,
  createChapterSchema,
  createLiveClassSchema,
  liveClassIdParamSchema,
  batchIdParamSchema,
  batchStudentsQuerySchema,
  studentIdParamSchema,
  doubtLinkQuerySchema,
  createTestSchema,
  createQuestionSchema,
  testIdParamSchema,
  questionIdParamSchema,
} from '../validators/teacher.validators.js';

const router = Router();
router.use(authMiddleware, roleGuard('teacher'));

router.get('/notifications', ctrl.listNotifications);
router.get('/notifications/unread-count', ctrl.unreadNotificationCount);
router.patch('/notifications/:id/read', validate(idParamSchema, 'params'), ctrl.markNotificationRead);

router.get('/schedule/today', ctrl.todaySchedule);
router.get('/batches', ctrl.myBatches);
router.get(
  '/batches/:batchId/students',
  validate(batchIdParamSchema, 'params'),
  validate(batchStudentsQuerySchema, 'query'),
  ctrl.batchStudents
);

// Cloudinary Upload Signature
import { generateSignature } from '../services/cloudinary.service.js';
router.get('/upload-signature', (req, res) => {
  res.json(generateSignature('campus'));
});

// Attendance — all plans (present/absent/late saved for everyone)
// WhatsApp absent-reminder links are filtered inside the service based on plan
router.post('/attendance', validate(markAttendanceSchema), ctrl.markAttendance);

// QR attendance — teacher generates a time-limited session, students scan it
router.post('/attendance/qr-session', validate(createQrSessionSchema), ctrl.createQrSession);
router.get(
  '/attendance/qr-session/:sessionId',
  validate(qrSessionIdParamSchema, 'params'),
  ctrl.getQrSessionStatus
);

// Subjects & Chapters
router.get('/subjects', ctrl.listSubjects);
router.get('/chapters', ctrl.listChapters);
router.post('/chapters', validate(createChapterSchema), ctrl.createChapter);

// Video content — all plans (Basic has video library)
router.get('/content', ctrl.listContent);
router.post('/content', validate(createContentSchema), ctrl.createContent);

// Google account connection — required before scheduling a live class
// (Meet-link generation runs as the teacher's own Google identity).
router.get('/google/status', ctrl.googleConnectionStatus);
router.post('/google/connect', validate(connectGoogleSchema), ctrl.connectGoogleAccount);
router.delete('/google/disconnect', ctrl.disconnectGoogleAccount);

// Live classes — Pro & Elite only
router.get('/live-classes', featureGuard('live_classes'), ctrl.listLiveClasses);
router.post(
  '/live-classes',
  featureGuard('live_classes'),
  validate(createLiveClassSchema),
  ctrl.createLiveClass
);
router.delete(
  '/live-classes/:id',
  featureGuard('live_classes'),
  validate(liveClassIdParamSchema, 'params'),
  ctrl.deleteLiveClass
);
router.patch(
  '/live-classes/:id/end',
  featureGuard('live_classes'),
  validate(liveClassIdParamSchema, 'params'),
  ctrl.endLiveClass
);

// Doubt link — Pro & Elite only
router.get(
  '/doubt-link/:studentId',
  featureGuard('doubt_solving'),
  validate(studentIdParamSchema, 'params'),
  validate(doubtLinkQuerySchema, 'query'),
  ctrl.doubtLink
);

// Same report the coaching_admin sees for this student — ownership
// (student must be in one of this teacher's batches) is checked in the service.
router.get('/students/:studentId/details', validate(studentIdParamSchema, 'params'), ctrl.getStudentDetails);

// --- Tests & Quizzes ---
router.get('/tests', ctrl.listTests);
router.post('/tests', validate(createTestSchema), ctrl.createTest);

router.get('/tests/:testId/questions', validate(testIdParamSchema, 'params'), ctrl.getTestQuestions);
router.post('/tests/:testId/questions', validate(testIdParamSchema, 'params'), validate(createQuestionSchema), ctrl.addQuestion);
router.get('/tests/:testId/submissions', validate(testIdParamSchema, 'params'), ctrl.getTestSubmissions);

router.put('/questions/:questionId', validate(questionIdParamSchema, 'params'), validate(createQuestionSchema), ctrl.updateQuestion);
router.delete('/questions/:questionId', validate(questionIdParamSchema, 'params'), ctrl.deleteQuestion);

export default router;

