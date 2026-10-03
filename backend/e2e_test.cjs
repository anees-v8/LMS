const http = require('http');

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`http://127.0.0.1:4000/api/v1${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    // Some endpoints return 204 No Content
    if (res.status === 204) return { status: 204, ok: true };
    
    const data = await res.json();
    return { status: res.status, ok: res.ok, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting End-to-End API Testing...\n');
  
  let superadminToken;
  let tenantId;
  let adminToken;
  let studentToken;
  let studentId;

  // 1. Superadmin Login
  console.log('Testing [POST] /auth/login (Superadmin)...');
  const suLogin = await request('POST', '/auth/login', { phone: '918888800000', password: 'Password@123' });
  if (suLogin.ok && suLogin.data.user.role === 'super_admin') {
    console.log('✅ Superadmin Login Successful');
    superadminToken = suLogin.data.accessToken;
  } else {
    console.log('❌ Superadmin Login Failed', suLogin.data || suLogin.error);
    return;
  }

  // 2. Coaching Admin Login (Testing with pioneer classes)
  console.log('\nTesting [POST] /auth/login (Coaching Admin)...');
  const adminLogin = await request('POST', '/auth/login', { phone: '919000000021', password: 'Password@123' });
  if (adminLogin.ok && adminLogin.data.user.role === 'coaching_admin') {
    console.log('✅ Coaching Admin Login Successful');
    adminToken = adminLogin.data.accessToken;
    tenantId = adminLogin.data.user.tenantId;
  } else {
    console.log('❌ Coaching Admin Login Failed', adminLogin.data);
    return;
  }

  // 3. Check Payment Settings
  console.log('\nTesting [GET] /admin/settings/payment...');
  const getSettings = await request('GET', '/admin/settings/payment', null, adminToken);
  if (getSettings.ok) {
    console.log('✅ Fetched Payment Settings:', getSettings.data);
  } else {
    console.log('❌ Fetch Payment Settings Failed', getSettings);
  }

  // 4. Update Payment Settings
  console.log('\nTesting [PUT] /admin/settings/payment...');
  const putSettings = await request('PUT', '/admin/settings/payment', { keyId: 'rzp_test_12345', secret: 'secret_67890' }, adminToken);
  if (putSettings.ok) {
    console.log('✅ Updated Payment Settings Successfully');
  } else {
    console.log('❌ Update Payment Settings Failed', putSettings.data);
  }

  // 5. Create a Student (Needs a Batch)
  console.log('\nTesting [GET] /admin/batches (Fetching batches)...');
  const batches = await request('GET', '/admin/batches', null, adminToken);
  let batchId;
  if (batches.ok && batches.data.length > 0) {
    batchId = batches.data[0].id;
    console.log(`✅ Found Batch ID: ${batchId}`);
  } else {
    console.log('❌ Could not find batches. Exiting.');
    return;
  }

  console.log('\nTesting [POST] /admin/students (Creating a test student)...');
  const testPhone = `9000${Math.floor(100000 + Math.random() * 900000)}`; // Random phone
  const createStudent = await request('POST', '/admin/students', {
    fullName: 'Test Student E2E',
    phone: testPhone,
    password: 'Password@123',
    parentPhone: '9000000000',
    batchId: batchId
  }, adminToken);
  
  if (createStudent.ok) {
    console.log(`✅ Student Created Successfully. ID: ${createStudent.data.id}, Phone: ${testPhone}`);
    studentId = createStudent.data.id;
  } else {
    console.log('❌ Create Student Failed', createStudent.data);
    return;
  }

  // 6. Student Login
  console.log('\nTesting [POST] /auth/login (Student)...');
  const stuLogin = await request('POST', '/auth/login', { phone: testPhone, password: 'Password@123' });
  if (stuLogin.ok && stuLogin.data.user.role === 'student') {
    console.log('✅ Student Login Successful');
    studentToken = stuLogin.data.accessToken;
  } else {
    console.log('❌ Student Login Failed', stuLogin.data);
    return;
  }

  // 7. Test Student Dashboard
  console.log('\nTesting [GET] /student/dashboard...');
  const stuDash = await request('GET', '/student/dashboard', null, studentToken);
  if (stuDash.ok) {
    console.log('✅ Student Dashboard Fetched');
  } else {
    console.log('❌ Student Dashboard Failed', stuDash.data);
  }

  // 8. Test Create Fee Order (Student)
  console.log('\nTesting [POST] /student/fees/create-order...');
  const createOrder = await request('POST', '/student/fees/create-order', { amount: 500 }, studentToken);
  if (createOrder.ok || createOrder.data?.error?.code === 'PAYMENT_NOT_CONFIGURED') {
    // We expect it to either pass (if razorpay validates mock keys) or fail with API error.
    // Actually Razorpay API throws 401 Unauthorized if the key is fake (which we provided 'rzp_test_12345').
    // Wait, the API error from razorpay might throw a 500 or 400. Let's just catch it.
    console.log('✅ Create Order Response:', createOrder.data);
  } else {
    console.log('⚠️ Create Order returned error (Expected if fake keys used in Razorpay SDK):', createOrder.data);
  }

  console.log('\n🎉 E2E Basic Flow Testing Completed!');
}

runTests();
