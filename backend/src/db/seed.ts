import bcrypt from 'bcryptjs';
import type { PoolClient } from 'pg';
import pool, { withTransaction } from '../config/db.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Idempotent-ish seed: wipes tenant/user/lead data then inserts a realistic
 * demo dataset for 2 institutes (Apex, Pioneer) + a global super admin.
 * Default password for every seeded user: "Password@123"
 */
const PASSWORD = 'Password@123';

async function seed(): Promise<void> {
  try {
    const hash = await bcrypt.hash(PASSWORD, 10);

    await withTransaction(async (client: PoolClient) => {
      // Clean slate for repeatable seeding
      await client.query(`
        TRUNCATE test_results, tests, attendance, batch_schedule, teacher_assignments,
                 batch_enrollments, fee_payments, fee_dues, content, live_classes,
                 notifications, students, subjects, batches, subscriptions, users,
                 tenants, leads, audit_log
        RESTART IDENTITY CASCADE;
      `);

      // ---- Tenants ----
      const apex = (
        await client.query<{ id: number }>(
          `INSERT INTO tenants (name, slug, city, contact_phone)
         VALUES ('Apex Academy','apex','Nashik','919999900001') RETURNING id`
        )
      ).rows[0].id;

      const pioneer = (
        await client.query<{ id: number }>(
          `INSERT INTO tenants (name, slug, city, contact_phone)
         VALUES ('Pioneer Classes','pioneer','Nashik','919999900002') RETURNING id`
        )
      ).rows[0].id;

      // ---- Subscriptions ----
      await client.query(
        `INSERT INTO subscriptions (tenant_id, status, amount, trial_ends_at)
         VALUES ($1,'trial',$2, now() + ($3 || ' days')::interval)`,
        [apex, env.billing.defaultAmount, env.billing.trialDays]
      );
      await client.query(
        `INSERT INTO subscriptions (tenant_id, status, amount, next_billing_date)
         VALUES ($1,'active',$2, now() + interval '30 days')`,
        [pioneer, env.billing.defaultAmount]
      );

      // ---- Global super admin (tenant_id NULL) ----
      await client.query(
        `INSERT INTO users (tenant_id, role, full_name, phone, email, password_hash)
         VALUES (NULL,'super_admin','Platform Owner','918888800000','owner@campusweb.co.in',$1)`,
        [hash]
      );

      // Helper to make a user. Teachers additionally get a row in `teachers`
      // (status/leave_start/leave_end live there now, not on `users`).
      const mkUser = async (
        tenantId: number,
        role: string,
        name: string,
        phone: string
      ): Promise<number> => {
        const id = (
          await client.query<{ id: number }>(
            `INSERT INTO users (tenant_id, role, full_name, phone, password_hash)
           VALUES ($1,$2,$3,$4,$5) RETURNING id`,
            [tenantId, role, name, phone, hash]
          )
        ).rows[0].id;
        if (role === 'teacher') {
          await client.query(`INSERT INTO teachers (tenant_id, user_id) VALUES ($1,$2)`, [tenantId, id]);
        }
        return id;
      };

      // ---- Apex users ----
      await mkUser(apex, 'coaching_admin', 'Rajesh Deshmukh', '919000000011');
      const apexTeacher = await mkUser(apex, 'teacher', 'Sunita Patil', '919000000012');
      const apexStuUser = await mkUser(apex, 'student', 'Aarav Joshi', '919000000013');

      // ---- Pioneer users ----
      await mkUser(pioneer, 'coaching_admin', 'Meena Kulkarni', '919000000021');
      const pioTeacher = await mkUser(pioneer, 'teacher', 'Amit Shah', '919000000022');
      const pioStuUser = await mkUser(pioneer, 'student', 'Sara Khan', '919000000023');

      // ---- Subjects ----
      const apexPhysics = (
        await client.query<{ id: number }>(
          `INSERT INTO subjects (tenant_id, name) VALUES ($1,'Physics') RETURNING id`,
          [apex]
        )
      ).rows[0].id;
      await client.query(`INSERT INTO subjects (tenant_id, name) VALUES ($1,'Chemistry')`, [apex]);
      const pioMath = (
        await client.query<{ id: number }>(
          `INSERT INTO subjects (tenant_id, name) VALUES ($1,'Mathematics') RETURNING id`,
          [pioneer]
        )
      ).rows[0].id;

      // ---- Batches (fee template set directly on the batch now) ----
      const apexBatch = (
        await client.query<{ id: number }>(
          `INSERT INTO batches (tenant_id, name, grade, fee_amount, billing_cycle)
         VALUES ($1,'JEE 2026 Morning','Class 11',5000,'monthly') RETURNING id`,
          [apex]
        )
      ).rows[0].id;
      const pioBatch = (
        await client.query<{ id: number }>(
          `INSERT INTO batches (tenant_id, name, grade, fee_amount, billing_cycle)
         VALUES ($1,'NEET 2026 Evening','Class 12',6000,'monthly') RETURNING id`,
          [pioneer]
        )
      ).rows[0].id;

      // ---- Students ----
      const apexStudent = (
        await client.query<{ id: number }>(
          `INSERT INTO students (tenant_id, user_id, roll_no, parent_name, parent_phone, grade)
         VALUES ($1,$2,'A-101','Sanjay Joshi','919000000014','Class 11') RETURNING id`,
          [apex, apexStuUser]
        )
      ).rows[0].id;
      const pioStudent = (
        await client.query<{ id: number }>(
          `INSERT INTO students (tenant_id, user_id, roll_no, parent_name, parent_phone, grade)
         VALUES ($1,$2,'P-201','Imran Khan','919000000024','Class 12') RETURNING id`,
          [pioneer, pioStuUser]
        )
      ).rows[0].id;

      // ---- Enrollments ----
      await client.query(
        `INSERT INTO batch_enrollments (tenant_id, batch_id, student_id) VALUES ($1,$2,$3)`,
        [apex, apexBatch, apexStudent]
      );
      await client.query(
        `INSERT INTO batch_enrollments (tenant_id, batch_id, student_id) VALUES ($1,$2,$3)`,
        [pioneer, pioBatch, pioStudent]
      );

      // ---- Batch schedule (today, recurring weekly template) ----
      const dow = new Date().getDay();
      await client.query(
        `INSERT INTO batch_schedule (tenant_id, batch_id, subject_id, day_of_week, start_time, end_time)
         VALUES ($1,$2,$3,$4,'10:00','11:00')`,
        [apex, apexBatch, apexPhysics, dow]
      );
      await client.query(
        `INSERT INTO batch_schedule (tenant_id, batch_id, subject_id, day_of_week, start_time, end_time)
         VALUES ($1,$2,$3,$4,'18:00','19:00')`,
        [pioneer, pioBatch, pioMath, dow]
      );

      // ---- Teacher assignments (replaces the old implicit timetable link) ----
      await client.query(
        `INSERT INTO teacher_assignments (tenant_id, teacher_user_id, batch_id, subject_id)
         VALUES ($1,$2,$3,$4)`,
        [apex, apexTeacher, apexBatch, apexPhysics]
      );
      await client.query(
        `INSERT INTO teacher_assignments (tenant_id, teacher_user_id, batch_id, subject_id)
         VALUES ($1,$2,$3,$4)`,
        [pioneer, pioTeacher, pioBatch, pioMath]
      );

      // ---- Fee due (auto-generated equivalent) + a partial payment (Apex) ----
      const apexFeeDue = (
        await client.query<{ id: number }>(
          `INSERT INTO fee_dues (tenant_id, student_id, batch_id, title, amount, due_date, period_index)
         VALUES ($1,$2,$3,'Monthly Fee — Term 1',5000, now() + interval '10 days', 1) RETURNING id`,
          [apex, apexStudent, apexBatch]
        )
      ).rows[0].id;
      await client.query(
        `INSERT INTO fee_payments (tenant_id, student_id, fee_due_id, amount_paid, method, receipt_no)
         VALUES ($1,$2,$3,2000,'upi','RCPT-APEX-0001')`,
        [apex, apexStudent, apexFeeDue]
      );

      // ---- Chapter + Content (VOD) ----
      const apexKinematics = (
        await client.query<{ id: number }>(
          `INSERT INTO chapters (tenant_id, subject_id, name) VALUES ($1,$2,'Kinematics') RETURNING id`,
          [apex, apexPhysics]
        )
      ).rows[0].id;
      await client.query(
        `INSERT INTO content (tenant_id, batch_id, chapter_id, content_type, title, file_url, created_by, duration_minutes, duration_seconds)
         VALUES ($1,$2,$3,'video','Kinematics - Lecture 1','https://youtu.be/dQw4w9WgXcQ',$4,3,214)`,
        [apex, apexBatch, apexKinematics, apexTeacher]
      );

      // ---- Live class (today) ----
      await client.query(
        `INSERT INTO live_classes (tenant_id, batch_id, title, meet_url, scheduled_at, teacher_id)
         VALUES ($1,$2,'Doubt Session','https://meet.google.com/abc-defg-hij', now() + interval '2 hours',$3)`,
        [apex, apexBatch, apexTeacher]
      );

      // ---- Sample leads (demo bookings) ----
      await client.query(`
        INSERT INTO leads (owner_name, institute_name, phone, city, student_count, status, is_read, notified)
        VALUES
        ('Vikram Rao','Brilliant Tutorials','919111100001','Nashik',120,'new',false,true),
        ('Priya Sharma','Success Point','919111100002','Pune',60,'contacted',true,true);
      `);
    });

    logger.info('Seed complete.', { defaultPassword: PASSWORD });
    logger.info(
      'Logins → super_admin: 918888800000 | apex admin: 919000000011 | apex student: 919000000013'
    );
  } catch (err) {
    logger.error('Seed error', { error: err instanceof Error ? err.message : String(err) });
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void seed();
