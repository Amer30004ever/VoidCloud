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

async function api(method, path, token, bodyObj) {
  const body = bodyObj ? JSON.stringify(bodyObj) : undefined;
  const headers = { Authorization: `Bearer ${token}` };
  if (body) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(body);
  }
  return request(
    {
      hostname: 'localhost',
      port: 3001,
      path: `/api/v1${path}`,
      method,
      headers,
    },
    body,
  );
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
  if (!token) {
    console.error('Login failed', login.status, login.body);
    process.exit(1);
  }

  const action = process.argv[2] || 'list';
  const id = process.argv[3];

  const run = async (label, fn) => {
    const r = await fn();
    console.log(label, r.status, r.body.slice(0, 500));
    if (r.status >= 400) process.exit(1);
    return r;
  };

  if (action === 'login') {
    console.log('Login OK — token received');
    return;
  }

  if (action === 'list') {
    const list = await run('LIST', () => api('GET', '/cloud/deployments', token));
    console.log(list.body);
    return;
  }

  if (action === 'admin-stats') {
    await run('ADMIN_STATS', () => api('GET', '/cloud/admin/stats', token));
    return;
  }

  if (action === 'images') {
    await run('IMAGES', () => api('GET', '/cloud/images', token));
    return;
  }

  if (!id) {
    console.error('Usage: vps-api.js <action> [id]');
    console.error('Actions: list, delete, start, stop, restart, reset-password, clone, images, admin-stats');
    process.exit(1);
  }

  if (action === 'delete') {
    await run('DELETE', () => api('DELETE', `/cloud/deployments/${id}`, token));
    return;
  }
  if (action === 'start') {
    await run('START', () => api('POST', `/cloud/deployments/${id}/start`, token));
    return;
  }
  if (action === 'stop') {
    await run('STOP', () => api('POST', `/cloud/deployments/${id}/stop`, token));
    return;
  }
  if (action === 'restart') {
    await run('RESTART', () => api('POST', `/cloud/deployments/${id}/restart`, token));
    return;
  }
  if (action === 'reset-password') {
    await run('RESET_PW', () => api('POST', `/cloud/deployments/${id}/reset-root-password`, token));
    return;
  }
  if (action === 'clone') {
    await run('CLONE', () => api('POST', `/cloud/vps/${id}/clone`, token, { suffix: '-clone', syncData: false }));
    return;
  }

  console.error('Unknown action:', action);
  process.exit(1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
