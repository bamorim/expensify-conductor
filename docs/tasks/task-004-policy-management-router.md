# Task: Policy Management Router

## Meta Information

- **Task ID**: `TASK-004`
- **Title**: Policy Management Router & Policy Resolution Engine
- **Status**: `Completed`
- **Priority**: `P0`
- **Created**: 2025-11-08
- **Updated**: 2025-11-08
- **Estimated Effort**: 2 days
- **Actual Effort**: -

## Related Documents

- **PRD**: `/docs/product/prd-main.md` (FR4: Policy Management, FR5: Policy Resolution Engine)
- **Architecture**: `/docs/technical/architecture.md`

## Description

Implement the tRPC router for policy management and the critical policy resolution engine. Policies define spending rules (max amounts, periods, review requirements). The system supports organization-wide policies and user-specific policies with clear precedence rules. The policy resolution engine determines which policy applies to a given user/category combination.

## Acceptance Criteria

- [ ] Policy router created with CRUD and resolution procedures
- [ ] Create/update/delete procedures require admin role
- [ ] Organization-wide and user-specific policies fully supported
- [ ] Policy resolution engine implements correct precedence (user-specific > org-wide)
- [ ] Debug procedure provides transparency into policy resolution
- [ ] All inputs validated with Zod schemas
- [ ] Comprehensive tests for all policy scenarios and edge cases
- [ ] Proper error handling and helpful error messages
- [ ] No TypeScript errors

## TODOs

### Router Implementation
- [ ] Create `src/server/api/routers/policy.ts`
- [ ] Import: createTRPCRouter, protectedProcedure, TRPCError
- [ ] Import: z for Zod schemas
- [ ] Create input schemas:
  - [ ] createInput: { orgId, categoryId, userId?: string, maxAmount: number, period: 'MONTHLY'|'YEARLY', autoApprove: boolean }
  - [ ] updateInput: { id, maxAmount, period, autoApprove }
  - [ ] deleteInput: { id }
  - [ ] getByIdInput: { id }
  - [ ] listInput: { orgId }
  - [ ] listForUserInput: { orgId, userId, categoryId }
  - [ ] resolvePolicyInput: { orgId, userId, categoryId }
  - [ ] debugPolicyInput: { orgId, userId, categoryId }

### CRUD Procedures
- [ ] Implement `list` procedure
  - Input: orgId
  - Check: User is member of organization
  - Return: All policies for org (both org-wide and user-specific), with user info for user-specific
- [ ] Implement `getById` procedure
  - Input: id
  - Check: User is member of org owning policy
  - Return: Policy with full details
- [ ] Implement `create` procedure
  - Input: orgId, categoryId, optional userId, maxAmount, period, autoApprove
  - Check: User is admin of org
  - Check: Category belongs to org
  - Check: If userId provided, user belongs to org
  - Validation: maxAmount > 0, period is valid value
  - Return: Created policy
- [ ] Implement `update` procedure
  - Input: id, maxAmount, period, autoApprove
  - Check: User is admin of org owning policy
  - Validation: maxAmount > 0, period is valid
  - Return: Updated policy
- [ ] Implement `delete` procedure
  - Input: id
  - Check: User is admin of org owning policy
  - Return: Deleted policy

### Policy Resolution Engine
- [ ] Implement `resolvePolicy` procedure (internal helper or public procedure)
  - Input: orgId, userId, categoryId
  - Logic:
    1. Check if user-specific policy exists for (user, org, category)
    2. If yes, return that policy
    3. If no, check if org-wide policy exists for (org, category, userId=null)
    4. If yes, return that policy
    5. If no, throw "No policy found" error
  - Return: The applicable Policy
  - Tests: All precedence scenarios, missing policies
- [ ] Create helper function `getPolicyForExpense(orgId, userId, categoryId)`
  - Encapsulates resolution logic
  - Can be called from expense router

### Debug Procedure
- [ ] Implement `debugPolicy` procedure
  - Input: orgId, userId, categoryId
  - Return: Object with:
    - `userSpecificPolicy`: matching user-specific policy or null
    - `organizationPolicy`: matching org-wide policy or null
    - `selectedPolicy`: the final resolved policy or null
    - `reason`: string explaining which policy was selected
  - Useful for admins to understand policy resolution
  - Return all info even if no policy found

### Authorization Helpers
- [ ] Create/update helpers to check:
  - User is member of org
  - User is admin of org
  - Category belongs to org
  - User belongs to org (for user-specific policies)

### Integration with Root Router
- [ ] Register policyRouter in `src/server/api/root.ts`

### Testing
- [ ] Create `src/server/api/routers/policy.test.ts`
- [ ] Import shared vitest setup from TASK-001
- [ ] Test helpers:
  - [ ] Reuse: createTestOrg, createTestUser, createTestMembership, createTestCategory
  - [ ] New: createTestPolicy
- [ ] Test list procedure:
  - [ ] Returns all policies for org
  - [ ] Includes both org-wide and user-specific
  - [ ] Non-members cannot list
- [ ] Test getById procedure:
  - [ ] Returns policy by id
  - [ ] Fails if user not member
  - [ ] Fails if policy doesn't exist
- [ ] Test create procedure:
  - [ ] Creates org-wide policy successfully
  - [ ] Creates user-specific policy successfully
  - [ ] Fails if user not admin
  - [ ] Fails if category doesn't exist
  - [ ] Fails if userId provided but user not in org
  - [ ] Fails if maxAmount <= 0
  - [ ] Fails if invalid period
- [ ] Test update procedure:
  - [ ] Updates policy successfully
  - [ ] Fails if user not admin
  - [ ] Fails if policy doesn't exist
  - [ ] Fails if new maxAmount <= 0
- [ ] Test delete procedure:
  - [ ] Deletes policy successfully
  - [ ] Fails if user not admin
  - [ ] Fails if policy doesn't exist
- [ ] Test resolvePolicy procedure - edge cases:
  - [ ] User-specific policy takes precedence over org-wide
  - [ ] Returns org-wide when no user-specific
  - [ ] Returns null/error when no policy exists
  - [ ] Different categories have different policies
  - [ ] Returns correct policy for multiple users
  - [ ] Returns correct policy across multiple orgs
- [ ] Test debugPolicy procedure:
  - [ ] Shows user-specific policy when it exists
  - [ ] Shows org-wide policy when user-specific doesn't exist
  - [ ] Shows both when both exist (and explains precedence)
  - [ ] Shows helpful message when no policy found
- [ ] All tests use transactional DB

## Progress Updates

### 2025-11-08 - Initial
**Status**: Not Started
**Progress**: Task created and planning phase complete
**Blockers**: Requires TASK-001 completion
**Next Steps**: Begin router implementation after TASK-001

### 2025-11-08 - Completed
**Status**: Completed
**Progress**: All implementation and tests complete
- Created policy router with all CRUD procedures
- Implemented policy resolution engine with correct precedence
- Implemented debug policy procedure for transparency
- Created comprehensive test suite covering all scenarios
- Registered router in root
- Added test factory for policies
**Blockers**: None
**Next Steps**: Ready for TASK-005 (Expense Router) and TASK-009 (Policy UI)

## Completion Checklist

- [x] All acceptance criteria met
- [x] Code follows project standards
- [x] All tests passing, including edge cases
- [x] No TypeScript errors
- [x] Authorization checks comprehensive
- [x] Policy resolution logic thoroughly tested
- [x] Error messages helpful
- [x] Code review completed
- [x] Ready for TASK-005 (Expense Router) and TASK-009 (Policy UI)

## Notes

- Policy resolution is critical business logic - comprehensive testing is essential
- Consider extracting resolution logic to separate `policyResolution.ts` file for clarity
- Period field might be extended in future (weekly, daily, rolling, etc.) - design with extensibility
- User-specific policies override org-wide - this must be enforced in tests
- `debugPolicy` is powerful transparency tool for admins troubleshooting policy issues
- Can be developed in parallel with TASK-003, TASK-005, TASK-006 once TASK-001 complete

---

**Template Version**: 1.0
**Last Updated**: 2025-11-08
