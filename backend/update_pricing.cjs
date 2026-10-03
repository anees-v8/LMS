const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.cvzmodqzkrnbrrpvdquk:Hello%40bound123%23@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function updatePlans() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Basic Plan (ID: 1)
    await client.query(`
      UPDATE plan_catalog 
      SET 
        price_monthly = 19, 
        price_quarterly = 16, 
        price_yearly = 13,
        features = '["student_management", "batch_management", "digital_attendance", "fee_management", "online_tests"]'::jsonb
      WHERE name = 'Basic'
    `);

    // 2. Pro Plan (ID: 2)
    await client.query(`
      UPDATE plan_catalog 
      SET 
        price_monthly = 29, 
        price_quarterly = 24, 
        price_yearly = 19,
        features = '["student_management", "batch_management", "digital_attendance", "fee_management", "online_tests", "video_library", "whatsapp_reminders", "live_classes", "online_payments", "performance_reports"]'::jsonb
      WHERE name = 'Pro'
    `);

    // 3. Elite Plan (ID: 3)
    await client.query(`
      UPDATE plan_catalog 
      SET 
        price_monthly = 49, 
        price_quarterly = 42, 
        price_yearly = 35,
        features = '["student_management", "batch_management", "digital_attendance", "fee_management", "online_tests", "video_library", "whatsapp_reminders", "live_classes", "online_payments", "performance_reports", "teacher_accounts", "website_request"]'::jsonb
      WHERE name = 'Elite'
    `);

    await client.query('COMMIT');
    console.log('✅ Plans successfully updated to 19/29/49 Per-Student Pricing!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating plans:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

updatePlans();
