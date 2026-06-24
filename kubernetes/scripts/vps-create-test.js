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
  console.log('LOGIN', login.status, login.body.slice(0, 200));
  const token = JSON.parse(login.body).access_token;
  if (!token) process.exit(1);

  const vpsName = process.env.VPS_NAME || `ps-verify-${Date.now()}`;
  const vpsBody = JSON.stringify({
    name: vpsName,
    type: 'DOCKER_IMAGE',
    source: 'Ubuntu 22.04',
    cpu: 0.25,
    memory: 512,
    storage: Number(process.env.VPS_STORAGE || 1024),
    replicas: 1,
  });
  const created = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/cloud/deployments',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(vpsBody),
      },
    },
    vpsBody,
  );
  console.log('VPS', created.status);
  console.log(created.body);
  process.exit(created.status >= 400 ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
