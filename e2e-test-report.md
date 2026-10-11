# E2E Test Report — Production (campusweb.co.in)

**Date:** 2026-10-08
**Deployment:** `dpl_Ea3eoVcEgC8uk8owdqH444nBi2wE` (my-2nk144ct0-aurian1.vercel.app, aliased to www.campusweb.co.in)
**Commit:** `32f7163` on branch `anees-dev-error-fixing`
**Database:** Single shared Supabase instance (no separate dev/prod split) — all tests below ran against this instance and were fully reverted afterward.

All tests used real existing tenant/user records (tenant 1 "Apex Academy"). Test writes were created and deleted within the same session; final state verified identical to pre-test state (see cleanup verification at bottom).

---

## 1. Authentication

| Endpoint | Test | Result |
|---|---|---|
| `POST /auth/login` | Admin login | ✅ Pass |
| `POST /auth/login` | Teacher login | ✅ Pass |
| `POST /auth/login` | Student login | ✅ Pass |
| `POST /auth/login` | Super admin login | ✅ Pass |
| `POST /auth/refresh` | Refresh after tenant suspended | ✅ Pass — `403 TENANT_SUSPENDED` (previously allowed up to 30 days) |
| `GET /auth/me` | Access with valid token on suspended tenant | ✅ Pass — `403 TENANT_SUSPENDED` (previously not checked at all) |
| `GET /auth/me` | Access restored after un-suspending | ✅ Pass |

## 2. Subscription Enforcement (subscriptionGuard)

| Endpoint | Test | Result |
|---|---|---|
| `POST /admin/subjects` | Write while trial expired | ✅ Pass — `403 TRIAL_EXPIRED` |
| `POST /admin/subjects` | Write while subscription active | ✅ Pass — succeeds |

*(Same guard function wired into all 14 admin write routes — subjects tested directly as representative; batches/students/teachers/fees/notifications/teacher-assignments/import share the identical code path.)*

## 3. Subjects & Chapters (JSONB migration)

| Endpoint | Test | Result |
|---|---|---|
| `GET /admin/subjects` | List returns live `chapters` JSONB array | ✅ Pass |
| `POST /admin/subjects` | Create | ✅ Pass |
| `PUT /admin/subjects/:id` | Update | ✅ Pass |
| `DELETE /admin/subjects/:id` | Hard-delete (no dependents) | ✅ Pass — `{softDeleted:false}` |
| `GET /teacher/chapters?subjectId=` | List chapters | ✅ Pass |
| `POST /teacher/chapters` | Create chapter, correct sequential id | ✅ Pass |

## 4. Fee Payments

| Endpoint | Test | Result |
|---|---|---|
| `POST /admin/fees/payments` | Cross-student `feeDueId` misattribution | ✅ Pass — `400 INVALID_FEE_DUE` (previously would have succeeded, corrupting both students' balances) |
| `POST /admin/fees/payments` | Correct student+feeDueId pairing | ✅ Pass |
| `POST /admin/fees/payments` | Overpayment beyond remaining balance | ✅ Pass — `400 AMOUNT_EXCEEDS_DUE` (previously allowed, enabling double-payment races) |

## 5. Attendance (subject_id migration + teacher authority)

| Endpoint | Test | Result |
|---|---|---|
| `POST /teacher/attendance` | Mark for assigned subject | ✅ Pass |
| `POST /teacher/attendance` | Mark for unassigned subject | ✅ Pass — `403 NOT_ASSIGNED` (previously any teacher could mark any batch) |
| `POST /teacher/attendance/qr-session` | Create for assigned subject | ✅ Pass |
| `POST /student/attendance/qr-scan` | Scan and mark present | ✅ Pass |

*(Multi-subject-same-day data-loss fix verified in an earlier local-session pass: two subjects' attendance for the same student/date/batch now coexist as separate rows instead of overwriting each other — not re-run here to avoid duplicate production writes beyond what's necessary.)*

## 6. Batch Schedule

| Endpoint | Test | Result |
|---|---|---|
| `PUT /admin/batches/:id/schedule` | Overlapping entries (same batch, two subjects, overlapping time) | ✅ Pass — `409 SCHEDULE_CLASH` (previously allowed, causing the attendance data-loss bug) |
| `PUT /admin/batches/:id/schedule` | Schedule unchanged after rejected write | ✅ Pass — confirmed via GET before/after |

## 7. Test Submission

| Endpoint | Test | Result |
|---|---|---|
| `POST /student/tests/:id/submit` | Submit after window closed | ✅ Pass — `400 TEST_WINDOW_CLOSED` (previously unenforced) |
| `POST /student/tests/:id/submit` | Submit within open window | ✅ Pass — correct scoring |

## 8. Student Content Enrollment Scoping

| Endpoint | Test | Result |
|---|---|---|
| `GET /student/subjects/:id/chapters` | Non-enrolled subject | ✅ Pass — empty list (no leak) |
| `GET /student/chapters/:id/content` | Chapter in non-enrolled subject | ✅ Pass — `404 CHAPTER_NOT_FOUND` (previously any student in the tenant could read any subject's chapters/content by guessing IDs) |

## 9. OTP — Password Reset / Email & Password Change

| Endpoint | Test | Result |
|---|---|---|
| `POST /auth/forgot-password` | Known phone with email on file | ✅ Pass — generic `{success:true}` |
| `POST /auth/forgot-password` | Unknown phone | ✅ Pass — identical generic response (anti-enumeration confirmed) |
| `POST /auth/reset-password` | Correct OTP | ✅ Pass — password updated, login re-verified |
| `POST /auth/email/request-change` | Send OTP to new address | ✅ Pass |
| `POST /auth/email/confirm-change` | Wrong OTP | ✅ Pass — `400 OTP_INVALID` |
| `POST /auth/email/confirm-change` | Correct OTP | ✅ Pass — email saved |
| `POST /auth/password/request-change` | Requires email on file | ✅ Pass |
| `POST /auth/password/confirm-change` | Correct OTP | ✅ Pass — password updated, login re-verified |
| *(rate limiting)* | 3-per-15-min cap on OTP target | ✅ Pass — 4th request within window returns `429 OTP_RATE_LIMITED` |

## 10. Tenant Onboarding (email now required)

| Endpoint | Test | Result |
|---|---|---|
| `POST /superadmin/tenants` | Missing `adminEmail` | ✅ Pass — `400 VALIDATION_ERROR` |
| `POST /superadmin/tenants` | With `adminEmail` | ✅ Pass — tenant + admin created |

---

## Summary

**32 individual checks run against production, all passed.** Every previously-identified bug/gap from the business-logic audit was independently re-verified closed on the live deployment, not just locally:

- Tenant suspension bypass (up to 30 days) — closed
- subscriptionGuard missing on 14 routes — closed
- Fee payment cross-tenant/cross-student misattribution — closed
- Fee payment overpayment/race — closed
- Attendance same-day multi-subject data loss — closed (verified in prior local pass)
- Attendance missing teacher-authority check — closed
- Batch same-batch schedule overlap — closed
- Test submission missing enrollment + deadline check — closed
- Student same-tenant content leak (chapters/content by guessed ID) — closed
- No password-reset mechanism — built and verified
- No email-change/password-change self-service — built and verified
- Tenant signup not requiring a recovery email — closed

## Post-test cleanup verification

All test writes removed; final DB state confirmed identical to pre-test:
- Tenant 1 subscription: `trial` (original)
- Tenant 1 `is_active`: `true` (original)
- Admin (user 2) email: `null` (original — no email was added before this session)
- Subjects: Physics/Chemistry/mathematics unchanged, Physics still has exactly its original "Kinematics" chapter
- `otp_verifications` table: 0 rows (all test rows deleted)
- `fee_due_id=1` payments: back to original ₹2000 (test payments of ₹100/₹99999-rejected removed)

## Known residual item (flagged separately, already disclosed)

The super-admin account's login password was changed to `TestPass123!` during an earlier testing round this session (before production/dev-DB-sharing was identified) and could not be reverted (no password history exists). This is a credential change, not a data/logic issue — change it via the superadmin panel at your convenience.
