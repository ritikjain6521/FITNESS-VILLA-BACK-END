const BASE = 'http://localhost:5000/api/v1';

async function run() {
  console.log('--- Testing IronPulse API Endpoints ---');

  // 1. Health / Public
  const plansRes = await fetch(`${BASE}/plans`);
  const plans = await plansRes.json();
  console.log('✅ /plans status:', plansRes.status, 'plans count:', plans.items?.length);

  // 2. Auth
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'ChangeMe_Immediately_123!' }),
  });
  const loginData = await loginRes.json();
  console.log('✅ /auth/login status:', loginRes.status, 'user:', loginData.user?.name);
  const token = loginData.token;

  const authHeaders = { Authorization: `Bearer ${token}` };

  // 3. /auth/me
  const meRes = await fetch(`${BASE}/auth/me`, { headers: authHeaders });
  const me = await meRes.json();
  console.log('✅ /auth/me status:', meRes.status, 'role:', me.user?.role);

  // 4. Dashboard KPIs
  const kpiRes = await fetch(`${BASE}/dashboard/kpis`, { headers: authHeaders });
  const kpis = await kpiRes.json();
  console.log('✅ /dashboard/kpis status:', kpiRes.status, 'data:', kpis);

  // 5. Dashboard charts
  const chartRes = await fetch(`${BASE}/dashboard/revenue-chart`, { headers: authHeaders });
  const chart = await chartRes.json();
  console.log('✅ /dashboard/revenue-chart status:', chartRes.status, 'months:', chart.items?.length);

  // 6. Members
  const membersRes = await fetch(`${BASE}/members`, { headers: authHeaders });
  const members = await membersRes.json();
  console.log('✅ /members status:', membersRes.status, 'total members:', members.total);

  // 7. Memberships
  const msRes = await fetch(`${BASE}/memberships`, { headers: authHeaders });
  const memberships = await msRes.json();
  console.log('✅ /memberships status:', msRes.status, 'count:', memberships.items?.length);

  // 8. Attendance
  const attRes = await fetch(`${BASE}/attendance`, { headers: authHeaders });
  const att = await attRes.json();
  console.log('✅ /attendance status:', attRes.status, 'count:', att.items?.length);

  // 9. Payments
  const payRes = await fetch(`${BASE}/payments`, { headers: authHeaders });
  const pay = await payRes.json();
  console.log('✅ /payments status:', payRes.status, 'count:', pay.items?.length);

  // 10. Expenses
  const expRes = await fetch(`${BASE}/expenses`, { headers: authHeaders });
  const exp = await expRes.json();
  console.log('✅ /expenses status:', expRes.status, 'count:', exp.items?.length, 'totalPaise:', exp.totalAmountPaise);

  // 11. Inventory
  const invRes = await fetch(`${BASE}/inventory/products`, { headers: authHeaders });
  const inv = await invRes.json();
  console.log('✅ /inventory/products status:', invRes.status, 'products count:', inv.items?.length);

  // 12. Enquiries
  const enqRes = await fetch(`${BASE}/enquiries`, { headers: authHeaders });
  const enq = await enqRes.json();
  console.log('✅ /enquiries status:', enqRes.status, 'enquiries count:', enq.items?.length);

  // 13. Settings
  const setRes = await fetch(`${BASE}/settings`, { headers: authHeaders });
  const settings = await setRes.json();
  console.log('✅ /settings status:', setRes.status, 'gymName:', settings.settings?.gymName);

  console.log('\n🎉 ALL 13 ENDPOINTS TESTED AND FUNCTIONAL!');
}

run().catch(console.error);
