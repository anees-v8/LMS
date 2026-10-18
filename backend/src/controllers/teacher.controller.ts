import type { Request, Response } from 'express';
import * as svc from '../services/teacher.service.js';
import * as notificationCenter from '../services/notificationCenter.service.js';
import * as googleAuth from '../services/teacherGoogleAuth.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import { tenantId, userId } from './helpers.js';

export const connectGoogleAccount = asyncHandler(async (req: Request, res: Response) => {
  const result = await googleAuth.connectGoogleAccount(userId(req), tenantId(req), req.body.serverAuthCode);
  res.json({ success: true, googleEmail: result.googleEmail });
});
export const googleConnectionStatus = asyncHandler(async (req: Request, res: Response) =>
  res.json(await googleAuth.getConnectionStatus(userId(req)))
);
export const disconnectGoogleAccount = asyncHandler(async (req: Request, res: Response) => {
  await googleAuth.disconnectGoogleAccount(userId(req));
  res.json({ success: true });
});

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

export const todaySchedule = asyncHandler(async (req: Request, res: Response) =>
  res.json(await svc.todaySchedule(tenantId(req), userId(req)))
);

export const myBatches = asyncHandler(async (req: Request, res: Response) =>
  res.json(await svc.myBatches(tenantId(req), userId(req)))
);

export const batchStudents = asyncHandler(async (req: Request, res: Response) =>
  res.json(await svc.batchStudents(tenantId(req), Number(req.params.batchId), req.query.date as string | undefined))
);

export const markAttendance = asyncHandler(async (req: Request, res: Response) =>
  res.status(201).json(await svc.markAttendance(tenantId(req), userId(req), req.body))
);

export const createQrSession = asyncHandler(async (req: Request, res: Response) =>
  res.status(201).json(await svc.createQrAttendanceSession(tenantId(req), userId(req), req.body))
);

export const getQrSessionStatus = asyncHandler(async (req: Request, res: Response) =>
  res.json(await svc.getQrAttendanceSessionStatus(tenantId(req), userId(req), Number(req.params.sessionId)))
);

export const listContent = asyncHandler(async (req: Request, res: Response) => {
  const chapterId = req.query.chapterId ? Number(req.query.chapterId) : undefined;
  res.json(await svc.listContent(tenantId(req), userId(req), chapterId));
});

export const createContent = asyncHandler(async (req: Request, res: Response) =>
  res.status(201).json(await svc.createContent(tenantId(req), userId(req), req.body))
);

export const listSubjects = asyncHandler(async (req: Request, res: Response) =>
  res.json(await svc.listSubjects(tenantId(req)))
);

export const listChapters = asyncHandler(async (req: Request, res: Response) => {
  const subjectId = req.query.subjectId ? Number(req.query.subjectId) : undefined;
  res.json(await svc.listChapters(tenantId(req), subjectId));
});

export const createChapter = asyncHandler(async (req: Request, res: Response) =>
  res.status(201).json(await svc.createChapter(tenantId(req), req.body.subjectId, req.body.name))
);

export const createLiveClass = asyncHandler(async (req: Request, res: Response) =>
  res.status(201).json(await svc.createLiveClass(tenantId(req), userId(req), req.body))
);

export const listLiveClasses = asyncHandler(async (req: Request, res: Response) =>
  res.json(await svc.listLiveClasses(tenantId(req), userId(req)))
);

export const deleteLiveClass = asyncHandler(async (req: Request, res: Response) => {
  await svc.deleteLiveClass(tenantId(req), userId(req), Number(req.params.id));
  res.json({ success: true });
});

export const endLiveClass = asyncHandler(async (req: Request, res: Response) => {
  await svc.endLiveClass(tenantId(req), userId(req), Number(req.params.id));
  res.json({ success: true });
});

export const doubtLink = asyncHandler(async (req: Request, res: Response) => {
  const text = typeof req.query.text === 'string' ? req.query.text : undefined;
  res.json(await svc.doubtLink(tenantId(req), userId(req), Number(req.params.studentId), text));
});

export const getStudentDetails = asyncHandler(async (req: Request, res: Response) =>
  res.json(await svc.getStudentDetails(tenantId(req), userId(req), Number(req.params.studentId)))
);

import * as testSvc from '../services/test.service.js';

export const createTest = asyncHandler(async (req: Request, res: Response) =>
  res.status(201).json(await testSvc.createTest(tenantId(req), req.body))
);

export const listTests = asyncHandler(async (req: Request, res: Response) =>
  res.json(await testSvc.listTests(tenantId(req)))
);

export const addQuestion = asyncHandler(async (req: Request, res: Response) =>
  res.status(201).json(await testSvc.addQuestion(tenantId(req), Number(req.params.testId), req.body))
);

export const updateQuestion = asyncHandler(async (req: Request, res: Response) =>
  res.json(await testSvc.updateQuestion(tenantId(req), Number(req.params.questionId), req.body))
);

export const deleteQuestion = asyncHandler(async (req: Request, res: Response) =>
  res.json(await testSvc.deleteQuestion(tenantId(req), Number(req.params.questionId)))
);

export const getTestQuestions = asyncHandler(async (req: Request, res: Response) =>
  res.json(await testSvc.getTestQuestions(tenantId(req), Number(req.params.testId)))
);

export const getTestSubmissions = asyncHandler(async (req: Request, res: Response) =>
  res.json(await testSvc.getTestSubmissions(tenantId(req), Number(req.params.testId)))
);
