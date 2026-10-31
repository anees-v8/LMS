const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('Connecting to database...');
  // 1. Update Elite flat_teacher_limit to 15
  await pool.query('UPDATE plan_catalog SET flat_teacher_limit = 15 WHERE id = 3');
  console.log('✓ Elite flat_teacher_limit updated to 15');

  // 2. Add teacher_accounts to Basic plan features if not present
  await pool.query(`
    UPDATE plan_catalog 
    SET features = features || '["teacher_accounts"]'::jsonb 
    WHERE id = 1 AND NOT (features ? 'teacher_accounts')
  `);
  console.log('✓ Basic features updated to include teacher_accounts');

  // 3. Verify rows
  const { rows } = await pool.query(
    'SELECT id, name, flat_teacher_limit, features FROM plan_catalog ORDER BY id'
  );
  console.log('Current plan_catalog:');
  console.log(JSON.stringify(rows, null, 2));

  await pool.end();
  console.log('Done!');
}

main().catch(err => {
  console.error('Error updating DB:', err);
  process.exit(1);
});
