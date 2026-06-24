const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

(async () => {
  const loginBody = JSON.stringify({
    email: process.env.ADMIN_EMAIL || 'amer30004ever@hotmail.com',
    password: process.env.ADMIN_PASSWORD || 'Admin123',
  });
  const login = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginBody),
      },
    },
    loginBody,
  );
  const token = JSON.parse(login.body).access_token;
  const action = process.argv[2] || 'list';

  if (action === 'login') {
    console.log('Login OK — token received');
    return;
  }

  if (action === 'list') {
    const list = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/cloud/deployments',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(list.body);
    return;
  }

  if (action === 'delete' && process.argv[3]) {
    const id = process.argv[3];
    const del = await request({
      hostname: 'localhost',
      port: 3001,
      path: `/api/v1/cloud/deployments/${id}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('DELETE', del.status, del.body);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
