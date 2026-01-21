# Feature Specification: InvoiceMe Stabilization & Bug Fixes

**Feature Branch**: `003-invoiceme-stabilization`  
**Created**: 2026-01-21  
**Status**: Draft  
**Parent Spec**: [002-invoiceme-mvp](../002-invoiceme-mvp/)

## Overview

This specification focuses on stabilizing the InvoiceMe MVP by addressing critical bugs, improving UI/UX consistency, fixing deployment issues, and ensuring production readiness. This is a maintenance and quality improvement iteration building on the 002-invoiceme-mvp foundation.

## User Scenarios & Testing

### User Story 1 - Dialog Layout Fixes (Priority: P1)

**As a** user  
**I want** dialogs to display correctly with proper button layouts  
**So that** I can edit and manage businesses without UI errors

**Why this priority**: Critical UX issue blocking core functionality (edit business dialog was crashing)

**Independent Test**: Can be fully tested by opening any business edit dialog and verifying buttons display correctly without ParentDataWidget errors

**Acceptance Scenarios**:

1. **Given** I am on the home screen with businesses, **When** I click edit on any business, **Then** the dialog opens without errors and buttons are properly positioned (Delete on left, Cancel/Save on right)
2. **Given** the edit dialog is open, **When** I interact with Delete/Cancel/Save buttons, **Then** each button responds correctly without widget tree errors

---

### User Story 2 - Responsive Web Layout (Priority: P1)

**As a** user accessing the app from different devices  
**I want** the app to display properly on all screen sizes  
**So that** dialogs and UI elements are appropriately sized

**Why this priority**: Critical production issue where dialogs were oversized on production but correct in development

**Independent Test**: Can be tested by accessing the production web app on different devices and screen sizes, verifying dialogs render at proper sizes

**Acceptance Scenarios**:

1. **Given** I access the app on a high-DPI device, **When** I open any dialog or modal, **Then** it renders at the appropriate logical pixel size (not physical pixel size)
2. **Given** I access the app on mobile web, **When** I interact with any UI element, **Then** it responds to proper viewport dimensions

---

### User Story 3 - Launch Configuration Setup (Priority: P2)

**As a** developer  
**I want** working VS Code launch configurations  
**So that** I can debug the frontend and backend easily

**Why this priority**: Developer experience improvement, not blocking end users but critical for development velocity

**Independent Test**: Can be tested by using F5 in VS Code/Cursor to launch configurations and verify they start correctly

**Acceptance Scenarios**:

1. **Given** VS Code is open with the project, **When** I select "Full Stack: Debug" and press F5, **Then** both backend and frontend start without path errors
2. **Given** I'm debugging, **When** I set breakpoints in Dart code, **Then** the debugger pauses correctly
3. **Given** I'm in debug mode, **When** I save a file, **Then** hot reload applies changes instantly

---

### User Story 4 - Deployment Pipeline Fixes (Priority: P2)

**As a** project maintainer  
**I want** reliable deployment pipelines  
**So that** changes can be deployed to production automatically

**Why this priority**: Important for CI/CD but not blocking user functionality

**Independent Test**: Can be tested by pushing to main branch and verifying GitHub Actions deploy successfully to Render and Cloudflare Pages

**Acceptance Scenarios**:

1. **Given** I push changes to main branch, **When** GitHub Actions runs, **Then** frontend deploys to Cloudflare Pages successfully
2. **Given** backend code changes, **When** Render deploys, **Then** the Docker build completes and app starts without libssl or path errors
3. **Given** deployment completes, **When** I access the production URLs, **Then** the app functions correctly with new changes

---

### User Story 5 - Code Quality & Formatting (Priority: P3)

**As a** developer  
**I want** consistent code formatting  
**So that** the codebase is maintainable

**Why this priority**: Nice to have, improves maintainability but not blocking

**Independent Test**: Can be tested by running linter and verifying no errors

**Acceptance Scenarios**:

1. **Given** I run the Flutter analyzer, **When** analyzing any Dart file, **Then** no linter errors are present
2. **Given** I open any file, **When** I save, **Then** formatting applies automatically

---

### Edge Cases

- What happens when the viewport meta tag is missing on web platforms?
- How does the system handle dialog actions with incompatible parent widgets?
- What happens when launch configurations have incorrect paths or working directories?
- How does the Docker build handle missing system libraries?
- What happens when Flutter SDK versions mismatch between local and CI/CD?

## Requirements

### Functional Requirements

- **FR-001**: System MUST render dialogs correctly without ParentDataWidget errors
- **FR-002**: System MUST include viewport meta tag for responsive web rendering
- **FR-003**: System MUST provide working launch configurations for debug and release modes
- **FR-004**: System MUST build successfully in Docker with all required system libraries
- **FR-005**: System MUST deploy successfully through CI/CD pipelines
- **FR-006**: System MUST maintain consistent code formatting via auto-formatting on save
- **FR-007**: Dialog action buttons MUST be wrapped in appropriate parent widgets (Row for Spacer support)
- **FR-008**: Frontend MUST use correct working directories and program paths in launch configs
- **FR-009**: Backend MUST use correct entry point path (dist/src/main.js)
- **FR-010**: All code MUST pass linter checks without errors

### Key Fixes Implemented

- **Fixed**: ParentDataWidget error in edit business dialog (Spacer in OverflowBar → wrapped in Row)
- **Fixed**: Responsive layout on web (added viewport meta tag to index.html)
- **Fixed**: Launch configurations (corrected paths and working directories)
- **Fixed**: Backend deployment (Docker base image, libssl, entry point path)
- **Fixed**: Frontend deployment (GitHub Actions Flutter version, permissions, Cloudflare project setup)
- **Fixed**: TypeScript null safety in Groq service

### Key Entities

This specification doesn't introduce new entities but fixes issues in existing implementations from 002-invoiceme-mvp.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Edit business dialog opens and functions without errors (0 ParentDataWidget errors)
- **SC-002**: Web app renders correctly on all screen sizes (dialogs properly sized on production)
- **SC-003**: Developers can launch app in debug mode with one F5 keypress (< 10 seconds to start)
- **SC-004**: Deployments succeed 100% of the time when code is valid
- **SC-005**: No linter errors in any Dart or TypeScript files (0 errors on `flutter analyze` and `tsc`)
- **SC-006**: Hot reload works in debug mode (changes apply in < 2 seconds)
- **SC-007**: Production app loads and functions correctly after deployment

## Known Issues Addressed

1. ✅ ParentDataWidget error: "Incorrect use of ParentDataWidget. The ParentDataWidget Expanded(flex: 1) wants to apply ParentData of type FlexParentData..."
2. ✅ Dialogs oversized on production web
3. ✅ Launch configurations not working (incorrect paths)
4. ✅ Backend deployment failing with libssl.so.1.1 missing
5. ✅ Backend deployment failing with wrong main.js path
6. ✅ Frontend deployment failing with Flutter version mismatch
7. ✅ Frontend deployment failing with Cloudflare project not found
8. ✅ Frontend deployment failing with GitHub permissions error
9. ✅ TypeScript null safety errors in Groq service

## Out of Scope

- New features or functionality
- Performance optimization beyond fixing critical issues
- UI/UX redesign (only fixes for broken UI)
- New integrations or services
- Database schema changes
- API contract changes

## Dependencies

- Existing 002-invoiceme-mvp implementation
- VS Code/Cursor IDE
- Docker for backend deployment
- GitHub Actions for CI/CD
- Cloudflare Pages for frontend hosting
- Render for backend hosting

## References

- Parent Spec: [002-invoiceme-mvp](../002-invoiceme-mvp/)
- Deployment Guide: `/DEPLOYMENT_GUIDE.md`
- Workflow Rules: `/.cursor/rules/workflow.mdc`
