# Decisions Log: InvoiceMe Stabilization

**Spec**: 003-invoiceme-stabilization  
**Date Range**: 2026-01-20 to 2026-01-21

---

## Decision 001: Dialog Action Layout Pattern

**Date**: 2026-01-21  
**Status**: ✅ Implemented  
**Context**: Edit business dialog crashed with ParentDataWidget error

### Problem
`Spacer` widget was placed directly in `AlertDialog.actions` list. Dialog actions use `OverflowBar` which doesn't support `Expanded`/`Spacer` widgets (they require `Flex`/`Row`/`Column`).

### Options Considered

1. **Remove Spacer** - Simple but loses desired button layout
2. **Use MainAxisAlignment** - Doesn't work in OverflowBar
3. **Wrap in Row** - Allows Spacer to work correctly ✅

### Decision
Wrap all dialog actions in a `Row` widget when `Spacer` is needed.

### Rationale
- Maintains desired button layout (Delete left, Cancel/Save right)
- Fixes widget tree error
- Follows Flutter best practices
- Minimal code change

### Implementation
```dart
actions: [
  Row(
    children: [
      TextButton(...), // Delete (left)
      const Spacer(), // Works in Row
      TextButton(...), // Cancel (right)
      const SizedBox(width: 8),
      ElevatedButton(...), // Save (right)
    ],
  ),
]
```

### Impact
- ✅ Dialog opens without errors
- ✅ Buttons properly positioned
- ✅ No breaking changes to behavior

---

## Decision 002: Responsive Web Layout Fix

**Date**: 2026-01-21  
**Status**: ✅ Implemented  
**Context**: Dialogs were oversized on production web but correct in development

### Problem
Missing viewport meta tag caused Flutter web to use physical pixels instead of logical pixels on high-DPI screens.

### Options Considered

1. **CSS Media Queries** - Doesn't fix root cause
2. **Flutter Size Constraints** - Band-aid solution
3. **Add Viewport Meta Tag** - Standard web practice ✅

### Decision
Add viewport meta tag to `frontend/web/index.html`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```

### Rationale
- Standard requirement for responsive web apps
- Fixes root cause (pixel ratio issue)
- No code changes in Dart needed
- Affects all UI elements correctly

### Implementation
Modified `frontend/web/index.html` header section.

### Impact
- ✅ Dialogs properly sized on all devices
- ✅ Responsive layout works correctly
- ✅ Mobile web experience improved

---

## Decision 003: Launch Configuration Paths

**Date**: 2026-01-21  
**Status**: ✅ Implemented (later deleted by user)  
**Context**: VS Code launch configurations didn't work

### Problem
Incorrect paths and working directories in `.vscode/launch.json`.

### Issues Found

1. `program: "frontend/lib/main.dart"` with `cwd: "frontend"` → Should be `"lib/main.dart"`
2. `cwd: "frontend"` → Should be `"${workspaceFolder}/frontend"`
3. API_URL passed via `env` → Should use `--dart-define` for Flutter

### Decision
Fix all path references and use proper workspace variables.

### Rationale
- Dart extension expects program path relative to cwd
- Workspace variables ensure portability
- --dart-define is Flutter's standard for compile-time constants

### Implementation
```json
{
  "program": "lib/main.dart",
  "cwd": "${workspaceFolder}/frontend",
  "args": ["--dart-define=API_URL=http://localhost:3000"]
}
```

### Impact
- ✅ F5 debugging works
- ✅ Breakpoints function correctly
- ✅ Hot reload operational

**Note**: User later deleted `.vscode/` folder, may need to recreate if needed.

---

## Decision 004: Backend Docker Base Image

**Date**: 2026-01-21  
**Status**: ✅ Implemented  
**Context**: Render deployment failed with `libssl.so.1.1` missing

### Problem
Alpine Linux (`node:18-alpine`) uses musl libc, causing library compatibility issues with Prisma and other native modules.

### Options Considered

1. **Install libssl in Alpine** - Doesn't fully resolve musl issues
2. **Use Debian-based image** - Standard solution ✅
3. **Build custom Alpine image** - Overkill

### Decision
Switch runtime base image from `node:18-alpine` to `node:18-slim` (Debian-based).

### Rationale
- Debian has better library compatibility
- Prisma officially supports Debian
- Minimal size difference for final image
- Industry standard for Node.js production

### Implementation
```dockerfile
FROM node:18-alpine AS builder  # Keep for build
FROM node:18-slim              # Change for runtime
RUN apt-get update && apt-get install -y openssl tesseract-ocr ...
ENV PRISMA_CLI_BINARY_TARGETS=debian-openssl-3.0.x
```

### Impact
- ✅ Deployment succeeds on Render
- ✅ All dependencies work correctly
- ✅ No runtime errors

---

## Decision 005: Backend Entry Point Path

**Date**: 2026-01-21  
**Status**: ✅ Implemented  
**Context**: Render deployment started but immediately crashed

### Problem
Docker CMD referenced `dist/main.js` but NestJS compiles to `dist/src/main.js`.

### Decision
Update both `package.json` and `Dockerfile` entry points:
- `package.json`: `"start:prod": "node dist/src/main.js"`
- `Dockerfile`: `CMD ["node", "dist/src/main.js"]`

### Rationale
- Matches NestJS build output structure
- Consistent across local and Docker environments
- Simple fix with high impact

### Impact
- ✅ Backend starts successfully
- ✅ Health checks pass
- ✅ Production deployment stable

---

## Decision 006: Frontend Flutter Version in CI/CD

**Date**: 2026-01-21  
**Status**: ✅ Implemented  
**Context**: GitHub Actions failed with Dart SDK version mismatch

### Problem
CI used Flutter 3.19.0 (Dart 3.3.0) but `pubspec.yaml` requires Dart ^3.10.7.

### Decision
Update GitHub Actions workflow to use Flutter 3.38.6 (includes Dart 3.10.7+).

### Rationale
- Must match local development environment
- Ensures consistent behavior across environments
- Prevents version-related bugs

### Implementation
```yaml
- uses: subosito/flutter-action@v2
  with:
    flutter-version: "3.38.6"
```

### Impact
- ✅ GitHub Actions builds succeed
- ✅ Version consistency maintained

---

## Decision 007: GitHub Actions Permissions

**Date**: 2026-01-21  
**Status**: ✅ Implemented  
**Context**: Cloudflare Pages action failed with 403 error

### Problem
GitHub Action didn't have permission to create deployment status.

### Decision
Add explicit permissions to workflow:
```yaml
permissions:
  contents: read
  deployments: write
```

### Rationale
- Required by Cloudflare Pages action
- Security best practice (explicit permissions)
- Minimal scope (only what's needed)

### Impact
- ✅ Deployments create GitHub status
- ✅ Workflow completes successfully

---

## Decision 008: TypeScript Null Safety in Groq Service

**Date**: 2026-01-21  
**Status**: ✅ Implemented  
**Context**: TypeScript compilation errors in error handling

### Problem
`error.response.status` could be undefined, causing TS18048 errors.

### Decision
Extract status code to variable and check for undefined:
```typescript
const statusCode = error.response?.status;
if (statusCode !== undefined && statusCode >= 500) {
  // retry logic
}
```

### Rationale
- Proper null safety handling
- TypeScript strict mode compliance
- Clear error handling logic

### Impact
- ✅ TypeScript compilation succeeds
- ✅ Error handling works correctly
- ✅ No runtime errors

---

## Decision 009: Viewport Meta Tag Configuration

**Date**: 2026-01-21  
**Status**: ✅ Implemented  
**Context**: Mobile web and responsive design

### Problem
Needed to decide exact viewport configuration for Flutter web.

### Options Considered

1. **Allow zoom**: `user-scalable=yes`
2. **Disable zoom**: `user-scalable=no` ✅
3. **Limited zoom**: `maximum-scale=2.0`

### Decision
Use strict viewport with no zoom:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```

### Rationale
- Flutter web apps behave like native apps
- Prevents accidental zoom issues
- Consistent with PWA best practices
- User can still use browser zoom if needed

### Impact
- ✅ Consistent UI scaling
- ✅ No unexpected zoom behavior
- ✅ App-like experience

---

## Decision 010: Spec Structure for Stabilization

**Date**: 2026-01-21  
**Status**: ✅ Implemented  
**Context**: How to document stabilization work

### Problem
Needed to decide whether to:
1. Update 002-invoiceme-mvp in place
2. Create new 003-invoiceme-stabilization spec

### Decision
Create separate 003-invoiceme-stabilization spec.

### Rationale
- Maintains history of what was fixed
- Separates "building features" from "fixing bugs"
- Follows spec-kit patterns
- Clear documentation of stabilization phase
- Parent spec (002) remains as original design reference

### Implementation
- Created `specs/003-invoiceme-stabilization/`
- Documented all fixes as user stories
- Linked to parent spec

### Impact
- ✅ Clear documentation
- ✅ Traceable history
- ✅ Follows project standards

---

## Open Questions

*None - all issues have been resolved*

---

## Lessons Learned

### Flutter Web

1. **Always include viewport meta tag** in `web/index.html` for responsive apps
2. **Test on production** - development mode may not catch all issues
3. **Widget tree rules** - Know parent widget constraints (OverflowBar vs Row)

### Docker & Deployment

1. **Use Debian over Alpine** for Node.js apps with native dependencies
2. **Verify entry point paths** match build output structure
3. **Test Docker builds locally** before deploying

### CI/CD

1. **Match SDK versions** between local and CI environments
2. **Explicitly set permissions** in GitHub Actions
3. **Create infrastructure first** (Cloudflare project) before deployment

### Development

1. **Launch configurations** are critical for developer experience
2. **Document patterns** that prevent errors (like dialog actions)
3. **Fix TypeScript strict mode issues** immediately

---

## Architecture Decisions

*No architectural changes - this was a bug fix iteration*

---

## Migration Notes

*No migrations required - fixes were non-breaking*
