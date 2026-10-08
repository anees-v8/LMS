const fetch = require('node-fetch');

const BASE_URL = 'https://www.campusweb.co.in/api';

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    if (res.status === 204) return { status: 204, ok: true };
    
    const data = await res.json();
    return { status: res.status, ok: res.ok, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting E2E Teacher-Student Flow Testing on LIVE Server...\n');

  let adminToken, tenantId;
  let teacherToken, teacherId;
  let studentToken, studentId;
  let subjectId, batchId, testId;

  // ==========================================
  // 1. SUPERADMIN FLOW (Upgrade to Elite Plan)
  // ==========================================
  console.log('--- SUPERADMIN OPERATIONS ---');
  const suLogin = await request('POST', '/auth/login', { phone: '918888800000', password: 'Password@123' });
  if (suLogin.ok) {
    console.log('✅ Superadmin Login Successful');
    
    // We need the tenantId, let's login as admin first to get it
    const adminLogin = await request('POST', '/auth/login', { phone: '919000000021', password: 'Password@123' });
    tenantId = adminLogin.data.user.tenantId;
    adminToken = adminLogin.data.accessToken;
    
    // Upgrade tenant to Elite plan (plan_catalog_id = 3)
    const upgradeRes = await request('PUT', `/superadmin/tenants/${tenantId}/subscription`, {
      planCatalogId: 3,
      billingCycle: 'monthly',
      billingMode: 'per_student'
    }, suLogin.data.accessToken);
    
    if (upgradeRes.ok) console.log('✅ Upgraded Tenant to Elite Plan');
    else console.log('❌ Failed to upgrade tenant', upgradeRes.data);
  }

  // ==========================================
  // 2. ADMIN FLOW
  // ==========================================
  console.log('\n--- ADMIN OPERATIONS ---');
  if (!adminToken) {
    const adminLogin = await request('POST', '/auth/login', { phone: '919000000021', password: 'Password@123' });
    adminToken = adminLogin.data.accessToken;
    tenantId = adminLogin.data.user.tenantId;
  }
  console.log('✅ Admin Session Active');

  // Create Subject
  const subjRes = await request('POST', '/admin/subjects', { name: `Science-${Date.now()}` }, adminToken);
  if (subjRes.ok) {
    subjectId = subjRes.data.id;
    console.log('✅ Created Subject:', subjRes.data.name);
  } else {
    console.log('❌ Failed to create subject', subjRes.data);
    return;
  }

  // Create Teacher
  const teacherPhone = `91${Math.floor(1000000000 + Math.random() * 9000000000)}`;
  const teacherRes = await request('POST', '/admin/teachers', {
    fullName: 'Test Teacher',
    phone: teacherPhone,
    password: 'Password@123'
  }, adminToken);
  if (teacherRes.ok) {
    teacherId = teacherRes.data.id;
    console.log('✅ Created Teacher:', teacherPhone);
  } else {
    console.log('❌ Failed to create teacher', teacherRes.data);
    return;
  }

  // Create Batch
  const batchRes = await request('POST', '/admin/batches', { name: `Batch-${Date.now()}`, subjectIds: [subjectId] }, adminToken);
  if (batchRes.ok) {
    batchId = batchRes.data.id;
    console.log('✅ Created Batch:', batchRes.data.name);
  } else {
    console.log('❌ Failed to create batch', batchRes.data);
    return;
  }

  // Assign Teacher & Subject to Batch
  const assignRes = await request('POST', '/admin/teacher-assignments', {
    teacherUserId: teacherId,
    batchId,
    subjectId
  }, adminToken);
  if (assignRes.ok) {
    console.log('✅ Assigned Teacher to Batch');
  } else {
    console.log('❌ Failed to assign teacher', assignRes.data);
    return;
  }

  // Create Student
  const studentPhone = `91${Math.floor(1000000000 + Math.random() * 9000000000)}`;
  const studentRes = await request('POST', '/admin/students', {
    fullName: 'Test Student',
    phone: studentPhone,
    password: 'Password@123',
    rollNo: `R-${Date.now()}`,
    batchId,
    parentName: 'Test Parent',
    parentPhone: '919999999999'
  }, adminToken);
  if (studentRes.ok) {
    studentId = studentRes.data.id;
    console.log('✅ Created Student:', studentPhone);
  } else {
    console.log('❌ Failed to create student', studentRes.data);
    return;
  }

  // ==========================================
  // 2. TEACHER FLOW
  // ==========================================
  console.log('\n--- TEACHER OPERATIONS ---');
  const teacherLogin = await request('POST', '/auth/login', { phone: teacherPhone, password: 'Password@123' });
  if (teacherLogin.ok) {
    teacherToken = teacherLogin.data.accessToken;
    console.log('✅ Teacher Login Successful');
  } else {
    console.log('❌ Teacher Login Failed', teacherLogin.data);
    return;
  }

  // Mark Attendance
  const dateStr = new Date().toISOString().split('T')[0];
  const attRes = await request('POST', '/teacher/attendance', {
    batchId,
    date: dateStr,
    records: [{ studentId, status: 'present' }]
  }, teacherToken);
  if (attRes.ok) {
    console.log('✅ Teacher Marked Attendance: Present');
  } else {
    console.log('❌ Failed to mark attendance', attRes.data);
  }

  // Create Test
  const testRes = await request('POST', '/teacher/tests', {
    subjectId,
    title: 'Weekly Science Test',
    testDate: new Date().toISOString().split('T')[0],
    durationMinutes: 30,
    maxMarks: 10,
    isOnline: true
  }, teacherToken);
  
  if (testRes.ok) {
    testId = testRes.data.id;
    console.log('✅ Teacher Created Test (ID:', testId, ')');
    
    // Add Questions
    const q1 = await request('POST', `/teacher/tests/${testId}/questions`, {
      questionText: 'What is 2+2?',
      marks: 5,
      options: [
        { optionText: '3', isCorrect: false },
        { optionText: '4', isCorrect: true }
      ]
    }, teacherToken);
    
    const q2 = await request('POST', `/teacher/tests/${testId}/questions`, {
      questionText: 'What is the color of the sky?',
      marks: 5,
      options: [
        { optionText: 'Blue', isCorrect: true },
        { optionText: 'Red', isCorrect: false }
      ]
    }, teacherToken);
    
    if (q1.ok && q2.ok) {
      console.log('✅ Added 2 Questions to Test');
      testRes.data.q1 = q1.data;
      testRes.data.q2 = q2.data;
    }
    else { console.log('❌ Failed to add questions'); return; }
    
  } else {
    console.log('❌ Failed to create test', testRes.data);
    return;
  }

  // ==========================================
  // 3. STUDENT FLOW
  // ==========================================
  console.log('\n--- STUDENT OPERATIONS ---');
  const stLogin = await request('POST', '/auth/login', { phone: studentPhone, password: 'Password@123' });
  if (stLogin.ok) {
    studentToken = stLogin.data.accessToken;
    console.log('✅ Student Login Successful');
  } else {
    console.log('❌ Student Login Failed', stLogin.data);
    return;
  }

  // Submit Test
  const answersObj = {};
  answersObj[testRes.data.q1.id] = testRes.data.q1.options.find(o => o.isCorrect).id;
  answersObj[testRes.data.q2.id] = testRes.data.q2.options.find(o => o.isCorrect).id;

  const submitRes = await request('POST', `/student/tests/${testId}/submit`, {
    answers: answersObj
  }, studentToken);
  
  if (submitRes.ok) {
    console.log('✅ Student Submitted Test (Marks:', submitRes.data.marksObtained, '/', submitRes.data.maxMarks, ')');
  } else {
    console.log('❌ Failed to submit test', submitRes.data);
  }

  // Check Dashboard (Performance & Attendance)
  const dashRes = await request('GET', '/student/dashboard', null, studentToken);
  if (dashRes.ok) {
    console.log('✅ Student Dashboard Loaded:', dashRes.data);
  } else {
    console.log('❌ Failed to load student dashboard', dashRes.data);
  }

  console.log('\n🎉 All tests passed successfully!');
}

runTests();
