#!/usr/bin/env node

/**
 * Comprehensive debug script for AmerCloud VPS hosting platform
 * Tests all major features and provides diagnostic output
 */

const https = require('https');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const PROXMOX_HOST = process.env.PROXMOX_HOST || 'https://10.51.100.10:8006';
const PROXMOX_TOKEN_ID = process.env.PROXMOX_TOKEN_ID || 'root@pam!Amer-Cloud';
const PROXMOX_TOKEN_SECRET = process.env.PROXMOX_TOKEN_SECRET || '';
const PROXMOX_NODE = process.env.PROXMOX_NODE || 'workernode01';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function testProxmoxConnectivity() {
  section('Testing Proxmox API Connectivity');
  
  const agent = new https.Agent({ rejectUnauthorized: false });
  
  try {
    const response = await fetch(`${PROXMOX_HOST}/api2/json/nodes`, {
      headers: {
        Authorization: `PVEAPIToken=${PROXMOX_TOKEN_ID}=${PROXMOX_TOKEN_SECRET}`,
      },
      agent,
    });
    
    if (response.ok) {
      const data = await response.json();
      log('✓ Proxmox API is accessible', 'green');
      log(`  Nodes: ${JSON.stringify(data.data, null, 2)}`, 'blue');
      return true;
    } else {
      log(`✗ Proxmox API returned ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Proxmox API connection failed: ${error.message}`, 'red');
    return false;
  }
}

async function testProxmoxTemplates() {
  section('Testing Proxmox Templates');
  
  const agent = new https.Agent({ rejectUnauthorized: false });
  
  try {
    const response = await fetch(`${PROXMOX_HOST}/api2/json/nodes/${PROXMOX_NODE}/aplvm/content`, {
      headers: {
        Authorization: `PVEAPIToken=${PROXMOX_TOKEN_ID}=${PROXMOX_TOKEN_SECRET}`,
      },
      agent,
    });
    
    if (response.ok) {
      const data = await response.json();
      log('✓ Proxmox templates accessible', 'green');
      const templates = data.data.filter(item => item.content === 'vztmpl');
      log(`  Available templates: ${templates.length}`, 'blue');
      templates.forEach(t => {
        log(`    - ${t.volid}`, 'blue');
      });
      return templates;
    } else {
      log(`✗ Failed to list templates: ${response.status}`, 'red');
      return [];
    }
  } catch (error) {
    log(`✗ Template listing failed: ${error.message}`, 'red');
    return [];
  }
}

async function testProxmoxStorage() {
  section('Testing Proxmox Storage');
  
  const agent = new https.Agent({ rejectUnauthorized: false });
  
  try {
    const response = await fetch(`${PROXMOX_HOST}/api2/json/nodes/${PROXMOX_NODE}/storage`, {
      headers: {
        Authorization: `PVEAPIToken=${PROXMOX_TOKEN_ID}=${PROXMOX_TOKEN_SECRET}`,
      },
      agent,
    });
    
    if (response.ok) {
      const data = await response.json();
      log('✓ Proxmox storage accessible', 'green');
      log(`  Storage pools:`, 'blue');
      data.data.forEach(s => {
        log(`    - ${s.storage} (${s.type})`, 'blue');
      });
      return data.data;
    } else {
      log(`✗ Failed to list storage: ${response.status}`, 'red');
      return [];
    }
  } catch (error) {
    log(`✗ Storage listing failed: ${error.message}`, 'red');
    return [];
  }
}

async function testProxmoxNextID() {
  section('Testing Proxmox Next VMID');
  
  const agent = new https.Agent({ rejectUnauthorized: false });
  
  try {
    const response = await fetch(`${PROXMOX_HOST}/api2/json/cluster/nextid`, {
      headers: {
        Authorization: `PVEAPIToken=${PROXMOX_TOKEN_ID}=${PROXMOX_TOKEN_SECRET}`,
      },
      agent,
    });
    
    if (response.ok) {
      const data = await response.json();
      log(`✓ Next available VMID: ${data.data}`, 'green');
      return data.data;
    } else {
      log(`✗ Failed to get next VMID: ${response.status}`, 'red');
      return null;
    }
  } catch (error) {
    log(`✗ Next VMID fetch failed: ${error.message}`, 'red');
    return null;
  }
}

async function testBackendAPI() {
  section('Testing Backend API');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/status`);
    if (response.ok) {
      log('✓ Backend API is accessible', 'green');
      const data = await response.json();
      log(`  Status: ${JSON.stringify(data, null, 2)}`, 'blue');
      return true;
    } else {
      log(`✗ Backend API returned ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Backend API connection failed: ${error.message}`, 'red');
    return false;
  }
}

async function testCloudPlans() {
  section('Testing Cloud Plans API');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/cloud/plans`);
    if (response.ok) {
      const data = await response.json();
      log('✓ Cloud plans accessible', 'green');
      log(`  Available plans: ${data.length}`, 'blue');
      data.forEach(plan => {
        log(`    - ${plan.name} ($${plan.priceUSD}/mo, ${plan.cpuLimit} CPU, ${plan.memoryLimit}MB RAM)`, 'blue');
      });
      return data;
    } else {
      log(`✗ Failed to fetch plans: ${response.status}`, 'red');
      return [];
    }
  } catch (error) {
    log(`✗ Plans API failed: ${error.message}`, 'red');
    return [];
  }
}

async function testTemplatesAPI() {
  section('Testing Templates API');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/cloud/templates`);
    if (response.ok) {
      const data = await response.json();
      log('✓ Templates API accessible', 'green');
      log(`  Available templates: ${data.length}`, 'blue');
      data.forEach(t => {
        log(`    - ${t.label} (ID: ${t.id}, Proxmox ID: ${t.proxmoxId})`, 'blue');
      });
      return data;
    } else {
      log(`✗ Failed to fetch templates: ${response.status}`, 'red');
      return [];
    }
  } catch (error) {
    log(`✗ Templates API failed: ${error.message}`, 'red');
    return [];
  }
}

async function testSMTPStatus() {
  section('Testing SMTP Status');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/cloud/admin/smtp/status`);
    if (response.ok) {
      const data = await response.json();
      log('✓ SMTP status endpoint accessible', 'green');
      log(`  SMTP Status: ${JSON.stringify(data, null, 2)}`, 'blue');
      return data;
    } else {
      log(`✗ SMTP status returned ${response.status}`, 'red');
      return null;
    }
  } catch (error) {
    log(`✗ SMTP status check failed: ${error.message}`, 'red');
    return null;
  }
}

async function testImagesAPI() {
  section('Testing Images API');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/cloud/marketplace`);
    if (response.ok) {
      const data = await response.json();
      log('✓ Marketplace images accessible', 'green');
      log(`  Marketplace images: ${data.length}`, 'blue');
      return data;
    } else {
      log(`✗ Marketplace images returned ${response.status}`, 'red');
      const errorText = await response.text();
      log(`  Error: ${errorText}`, 'red');
      return null;
    }
  } catch (error) {
    log(`✗ Images API failed: ${error.message}`, 'red');
    return null;
  }
}

async function testClusterNodes() {
  section('Testing Cluster Nodes API');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/cloud/admin/cluster/nodes`);
    if (response.ok) {
      const data = await response.json();
      log('✓ Cluster nodes API accessible', 'green');
      log(`  Cluster nodes: ${JSON.stringify(data, null, 2)}`, 'blue');
      return data;
    } else {
      log(`✗ Cluster nodes returned ${response.status}`, 'red');
      const errorText = await response.text();
      log(`  Error: ${errorText}`, 'red');
      return null;
    }
  } catch (error) {
    log(`✗ Cluster nodes API failed: ${error.message}`, 'red');
    return null;
  }
}

async function checkEnvironmentVariables() {
  section('Checking Environment Variables');
  
  const requiredVars = [
    'PROXMOX_HOST',
    'PROXMOX_TOKEN_ID',
    'PROXMOX_TOKEN_SECRET',
    'PROXMOX_NODE',
    'PROXMOX_STORAGE',
    'PROXMOX_TEMPLATE',
    'PROXMOX_BRIDGE',
    'PROXMOX_GATEWAY',
    'PROXMOX_IP_POOL_CIDR',
    'DATABASE_URL',
    'SMTP_HOST',
    'SMTP_USER',
  ];
  
  let allSet = true;
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      const displayValue = varName.includes('SECRET') || varName.includes('PASSWORD') || varName.includes('TOKEN') 
        ? '***SET***' 
        : value;
      log(`✓ ${varName}: ${displayValue}`, 'green');
    } else {
      log(`✗ ${varName}: NOT SET`, 'red');
      allSet = false;
    }
  });
  
  return allSet;
}

async function main() {
  log('AmerCloud Feature Debug Script', 'cyan');
  log('Testing all major features and integrations\n', 'cyan');
  
  const results = {
    envVars: await checkEnvironmentVariables(),
    proxmoxConnectivity: await testProxmoxConnectivity(),
    proxmoxTemplates: await testProxmoxTemplates(),
    proxmoxStorage: await testProxmoxStorage(),
    proxmoxNextID: await testProxmoxNextID(),
    backendAPI: await testBackendAPI(),
    cloudPlans: await testCloudPlans(),
    templatesAPI: await testTemplatesAPI(),
    smtpStatus: await testSMTPStatus(),
    imagesAPI: await testImagesAPI(),
    clusterNodes: await testClusterNodes(),
  };
  
  section('Summary');
  
  const passed = Object.values(results).filter(r => r === true || (Array.isArray(r) && r.length > 0)).length;
  const total = Object.keys(results).length;
  
  log(`Tests passed: ${passed}/${total}`, passed === total ? 'green' : 'yellow');
  
  if (passed === total) {
    log('\n✓ All tests passed! System is healthy.', 'green');
  } else {
    log('\n✗ Some tests failed. Review the output above for details.', 'red');
  }
  
  process.exit(passed === total ? 0 : 1);
}

main().catch(error => {
  log(`\n✗ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
