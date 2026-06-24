const https = require('https');
const host = (process.env.PROXMOX_HOST || '').replace(/^https?:\/\//, '').split(':')[0];
const port = (process.env.PROXMOX_HOST || '').match(/:(\d+)/)?.[1] || 8006;
const opts = {
  hostname: host,
  port,
  path: '/api2/json/nodes',
  method: 'GET',
  rejectUnauthorized: false,
  headers: {
    Authorization: `PVEAPIToken=${process.env.PROXMOX_TOKEN_ID}=${process.env.PROXMOX_TOKEN_SECRET}`,
  },
};
https
  .request(opts, (res) => {
    let d = '';
    res.on('data', (c) => (d += c));
    res.on('end', () => console.log('HTTP', res.statusCode, d.slice(0, 300)));
  })
  .on('error', (e) => console.error('Proxmox error:', e.message))
  .end();
