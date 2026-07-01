## 📋 Manual Trigger Options Summary

| Option | What it does |
|--------|--------------|
| `auto` | Auto-detect changes from git diff |
| `test-backend-only` | Test backend code only |
| `test-frontend-only` | Test frontend code only |
| `test-both` | Test both backend and frontend |
| `build-backend-only` | Test → Build → Push backend image |
| `build-frontend-only` | Test → Build → Push frontend image |
| `build-both` | Test → Build → Push both images |
| `full-ci-backend` | Test → Build → Test artifact → Push backend |
| `full-ci-frontend` | Test → Build → Test artifact → Push frontend |
| `full-ci-both` | Complete CI for both |

## 🎯 Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MANUAL TRIGGER OPTIONS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  build-backend-only:                                                         │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                                 │
│  │  Test   │───▶│  Build  │───▶│  Push   │                                 │
│  │  Code   │    │  Image  │    │         │                                 │
│  └─────────┘    └─────────┘    └─────────┘                                 │
│                                                                              │
│  full-ci-backend:                                                            │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│  │  Test   │───▶│  Build  │───▶│  Test   │───▶│  Build  │───▶│  Push   │   │
│  │  Code   │    │  (TS)   │    │ Artifact│    │  Image  │    │         │   │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

This gives you complete control over what runs in your CI pipeline! 🚀