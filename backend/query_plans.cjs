const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.cvzmodqzkrnbrrpvdquk:Hello%40bound123%23@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const plans = await pool.query(`SELECT * FROM plan_catalog ORDER BY display_order ASC, id ASC`);
    console.log('=== PLAN CATALOG ===');
    console.log(JSON.stringify(plans.rows, null, 2));

    const subs = await pool.query(`
      SELECT s.id, s.tenant_id, t.name as tenant_name, s.status, 
             s.plan_catalog_id, p.name as plan_name, s.billing_cycle, s.amount, s.per_student_rate
      FROM subscriptions s
      JOIN tenants t ON t.id = s.tenant_id
      LEFT JOIN plan_catalog p ON p.id = s.plan_catalog_id
    `);
    console.log('\n=== SUBSCRIPTIONS ===');
    console.log(JSON.stringify(subs.rows, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
