import os
import glob
import re

# Fix the broken tsconfig.build.json files
fixes = {
    'services/agent/tsconfig.build.json': '    "node_modules",\n    "dist",\n    "src/**/*.spec.ts",\n    "src/**/*.test.ts"\n  ]',
    'services/analytics/tsconfig.build.json': '    "node_modules",\n    "dist",\n    "src/**/*.spec.ts",\n    "src/**/*.test.ts"\n  ]',
    'services/audit/tsconfig.build.json': '    "node_modules",\n    "dist",\n    "src/**/*.spec.ts",\n    "src/**/*.test.ts"\n  ]',
    'services/auth/tsconfig.build.json': '    "node_modules",\n    "dist",\n    "src/**/*.spec.ts",\n    "src/**/*.test.ts"\n  ]',
    'services/billing/tsconfig.build.json': '    "node_modules",\n    "dist",\n    "src/guards/permissions.guard.ts",\n    "src/guards/tenant.guard.ts",\n    "src/routes",\n    "src/**/*.spec.ts",\n    "src/**/*.test.ts"\n  ]',
    'services/crm/tsconfig.build.json': '    "node_modules",\n    "dist",\n    "src/**/*.spec.ts",\n    "src/**/*.test.ts"\n  ]',
    'services/email/tsconfig.build.json': '    "node_modules",\n    "dist",\n    "src/**/*.spec.ts",\n    "src/**/*.test.ts"\n  ]',
    'services/monitoring/tsconfig.build.json': '    "node_modules",\n    "dist",\n    "src/**/*.spec.ts",\n    "src/**/*.test.ts"\n  ]',
    'services/notification/tsconfig.build.json': '    "node_modules",\n    "dist",\n    "src/**/*.spec.ts",\n    "src/**/*.test.ts"\n  ]',
    'services/sub2api/tsconfig.build.json': '    "node_modules",\n    "dist",\n    "src/**/*.spec.ts",\n    "src/**/*.test.ts"\n  ]',
    'services/tenant/tsconfig.build.json': '    "node_modules",\n    "dist",\n    "src/**/*.spec.ts",\n    "src/**/*.test.ts"\n  ]',
    'services/user/tsconfig.build.json': '    "node_modules",\n    "dist",\n    "src/**/*.spec.ts",\n    "src/**/*.test.ts"\n  ]',
    'services/vps/tsconfig.build.json': '    "node_modules",\n    "dist",\n    "src/**/*.spec.ts",\n    "src/**/*.test.ts"\n  ]',
    'services/whatsapp/tsconfig.build.json': '    "node_modules",\n    "dist",\n    "src/**/*.spec.ts",\n    "src/**/*.test.ts"\n  ]',
}

for path, replacement in fixes.items():
    with open(path, 'r') as f:
        content = f.read()
    
    # Replace everything from "exclude": [ to ]
    content = re.sub(r'(\"exclude\": \[).*?(\])', r'\1\n' + replacement + r'\2', content, flags=re.DOTALL)
    
    with open(path, 'w') as f:
        f.write(content)
    print(f'Fixed {path}')
