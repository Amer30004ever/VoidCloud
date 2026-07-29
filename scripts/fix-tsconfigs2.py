import os
import glob
import re

for path in glob.glob('services/*/tsconfig.build.json'):
    with open(path, 'r') as f:
        content = f.read()
    
    # Fix double closing brackets
    content = content.replace('  ]]\n}', '  ]\n}')
    
    # Remove extra ] if present before }
    content = re.sub(r'\n\]\s*\}', '\n}', content)
    
    with open(path, 'w') as f:
        f.write(content)
    print(f'Fixed {path}')
