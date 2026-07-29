import os
import glob
import re

for path in glob.glob('services/*/tsconfig.build.json'):
    with open(path, 'r') as f:
        content = f.read()
    
    exclusions = ['src/**/*.spec.ts', 'src/**/*.test.ts', '**/*.spec.ts', '**/*.test.ts']
    already_excluded = any(excl in content for excl in exclusions)
    
    if not already_excluded and '"exclude"' in content:
        content = re.sub(
            r'(\"exclude\": \[[^\]]*)',
            r'\1\n    "src/**/*.spec.ts",\n    "src/**/*.test.ts",',
            content
        )
        with open(path, 'w') as f:
            f.write(content)
        print(f'Updated {path}')
    else:
        print(f'Skipped {path}')
