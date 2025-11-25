# Work Location Templates & DOA Implementation Plan

## Overview
This document outlines the implementation of Work Location Templates and Delegation of Authority (DOA) system.

## Database Entities Created

### 1. WorkLocationTemplate
- Stores template definitions for quick application
- Supports Day, Week, and Custom types
- User-owned, can be shared within tenant

### 2. WorkLocationTemplateItem
- Individual days/entries within a template
- References WorkLocationType enum
- Supports day offsets for flexible application

### 3. DelegationOfAuthorityLetter
- DOA letter content (large text area)
- Delegator and Designee users
- Effective date/time ranges
- Requires dual digital signatures
- No approval workflow needed

### 4. DigitalSignature
- Canvas-based signature storage (base64)
- Timestamp and verification
- IP address and user agent tracking

### 5. DOAActivation
- Links DOA letter to specific date ranges
- References work location preferences
- Tracks activation reason (Travel, PTO, etc.)

## API Endpoints Needed

### Templates
- GET /api/worklocationtemplates - List user's templates
- GET /api/worklocationtemplates/{id} - Get template details
- POST /api/worklocationtemplates - Create template
- PUT /api/worklocationtemplates/{id} - Update template
- DELETE /api/worklocationtemplates/{id} - Delete template
- POST /api/worklocationtemplates/{id}/apply - Apply template to dates

### DOA
- GET /api/delegationofauthority - List user's DOA letters
- GET /api/delegationofauthority/{id} - Get DOA details
- POST /api/delegationofauthority - Create DOA letter
- PUT /api/delegationofauthority/{id} - Update DOA (if not signed)
- POST /api/delegationofauthority/{id}/sign - Add signature
- POST /api/delegationofauthority/{id}/activate - Activate for date range
- GET /api/delegationofauthority/active - Get active delegations

## Frontend Components Needed

### Templates
1. **TemplateManager** - List and manage templates
2. **TemplateEditor** - Create/edit template
3. **TemplateApplicator** - Modal to apply template to dates

### DOA
1. **DOAList** - List all DOA letters
2. **DOAEditor** - Create/edit DOA letter (large textarea)
3. **SignaturePad** - Canvas for digital signatures
4. **DOAViewer** - View signed DOA letter
5. **DOAActivator** - Modal to activate DOA for specific dates
6. **ActiveDOABadge** - Show on calendar when DOA is active

## Implementation Phases

### Phase 1: Database & Migrations ✓
- Create entity classes
- Generate EF migration
- Update database

### Phase 2: Backend API
- Create controllers
- Implement CRUD operations
- Add authorization checks
- Implement signature verification

### Phase 3: Frontend Services
- Create TypeScript types
- Implement API service layers
- Create React hooks

### Phase 4: UI Components
- Build template UI
- Build DOA UI
- Add to dashboard/calendar
- Implement signature pad

### Phase 5: Integration
- Integrate with existing calendar
- Add notifications for designee
- Test end-to-end workflow

## Key Features

### Templates
- Quick apply common work location patterns
- Save time for repetitive schedules
- Share templates with team (optional)

### DOA System
- Self-authored delegation letters
- Legally binding digital signatures
- Simple designation process
- Clear audit trail
- Calendar integration
- Notification to designee

## Security Considerations
- Digital signatures include IP, timestamp, user agent
- Signatures cannot be modified once applied
- Full audit trail maintained
- Only authorized users can sign
- Email notification for verification
