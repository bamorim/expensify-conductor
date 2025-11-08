# Task: Database Schema & Organization Foundation

## Meta Information

- **Task ID**: `TASK-001`
- **Title**: Database Schema Design & Organization Foundation
- **Status**: `Completed`
- **Priority**: `P0`
- **Created**: 2025-11-08
- **Updated**: 2025-11-08
- **Estimated Effort**: 2-3 days
- **Actual Effort**: 1 day

## Related Documents

- **PRD**: `/docs/product/prd-main.md`
- **Architecture**: `/docs/technical/architecture.md`
- **Test Strategy**: `/docs/technical/architecture.md#testing-strategy`

## Description

Foundation task for the entire expense management system. This task includes:
1. Designing complete database schema for multi-tenant expense system
2. Implementing organization management with multi-tenancy support
3. Creating the organization tRPC router
4. Setting up shared vitest configuration for transactional testing
5. Removing Post model scaffolding
6. Running database migrations

This is a blocking task - all other work depends on schema completion.

## Acceptance Criteria

- [ ] Complete Prisma schema with all required models: Organization, OrganizationMembership, ExpenseCategory, Policy, Expense, ExpenseReview
- [ ] All models properly organization-scoped for multi-tenancy
- [ ] Proper indexes on frequently queried fields (orgId, userId, categoryId, etc.)
- [ ] Organization tRPC router created with basic CRUD operations
- [ ] Shared vitest setup file created that mocks db and auth for all tests
- [ ] Post model and all references removed from schema and codebase
- [ ] Prisma migration created and applied successfully
- [ ] Organization creation tested with transactional testing
- [ ] All tests passing with transactional DB setup

## TODOs

### Database Design
- [ ] Design Organization model (id, name, createdAt, updatedAt)
- [ ] Design OrganizationMembership model (orgId, userId, role: ADMIN|MEMBER, createdAt)
- [ ] Design ExpenseCategory model (id, orgId, name, description, createdAt, updatedAt)
- [ ] Design Policy model (id, orgId, categoryId, userId?, maxAmount, period: MONTHLY|YEARLY, autoApprove, createdAt, updatedAt)
- [ ] Design Expense model (id, orgId, userId, categoryId, amount, date, description, status: SUBMITTED|APPROVED|REJECTED, createdAt, updatedAt)
- [ ] Design ExpenseReview model (id, expenseId, reviewerId, status, comment, createdAt, updatedAt)
- [ ] Add proper relationships and foreign keys
- [ ] Add indexes for orgId, userId, categoryId on all relevant models

### Remove Post Model
- [ ] Remove Post model from `prisma/schema.prisma`
- [ ] Remove `src/server/api/routers/post.ts`
- [ ] Remove `src/server/api/routers/post.test.ts`
- [ ] Remove `src/app/_components/post.tsx`
- [ ] Update `src/server/api/root.ts` to remove post router import and registration
- [ ] Update `src/app/page.tsx` to remove post-related imports and components

### Organization Router
- [ ] Create `src/server/api/routers/organization.ts`
- [ ] Implement `create` procedure (name, userId → Organization)
- [ ] Implement `list` procedure (userId → Organization[])
- [ ] Implement `getById` procedure (orgId → Organization with members)
- [ ] Implement `update` procedure (orgId, name → Organization) - admin only
- [ ] Implement `inviteUser` procedure (orgId, email → invitation) - admin only
- [ ] Implement `acceptInvitation` procedure (token, userId → OrganizationMembership)
- [ ] Implement `listMembers` procedure (orgId → members with roles)
- [ ] Add Zod schemas for all inputs
- [ ] Add organization membership authorization checks

### Vitest Setup
- [ ] Create `src/server/api/routers/setup.test.ts` with shared setup
  - Import and call `PrismaTestingHelper` from `@chax-at/transactional-prisma-testing`
  - Mock `~/server/db` to provide transactional proxy
  - Mock `~/server/auth` for test sessions
  - Export beforeEach/afterEach setup hooks
  - Create test helper factories (createTestOrg, createTestUser, etc.)
- [ ] Document how to use shared setup in other test files
- [ ] Update `src/server/api/routers/post.test.ts` (or delete) to show new pattern

### Organization Router Tests
- [ ] Test organization creation
- [ ] Test organization listing for user
- [ ] Test getById with member list
- [ ] Test update (success and unauthorized)
- [ ] Test invitation creation
- [ ] Test invitation acceptance
- [ ] Test member listing
- [ ] All tests using transactional setup

### Migrations
- [ ] Create Prisma migration for schema changes
- [ ] Verify migration applies cleanly
- [ ] Test migration rollback and re-apply

## Progress Updates

### 2025-11-08 - Initial
**Status**: Not Started
**Progress**: Task created and planning phase complete
**Blockers**: None
**Next Steps**: Begin database schema design

### 2025-11-08 - Implementation Complete
**Status**: Completed ✅
**Progress**: 
- ✅ Complete Prisma schema implemented with all models (Organization, OrganizationMembership, ExpenseCategory, Policy, Expense, ExpenseReview)
- ✅ Post model and all references removed from codebase
- ✅ Shared vitest setup created with transactional testing helpers
- ✅ Organization tRPC router implemented with full CRUD operations
- ✅ Comprehensive test suite written for organization router (all scenarios covered)
- ✅ Prisma migration created and applied successfully
- ✅ All tests passing after user fixes

**Blockers**: None
**Next Steps**: Ready for TASK-002 and parallel router tasks

## Completion Checklist

- [x] All acceptance criteria met
- [x] Code follows project standards
- [x] All tests written and passing
- [x] No Post model references remain in codebase
- [x] Prisma migration created and tested
- [x] Documentation updated
- [ ] Code review completed
- [x] Ready for TASK-002 and parallel router tasks

## Notes

- The shared vitest setup is critical for all subsequent router tests
- Multi-tenancy must be enforced at the database level (foreign keys) and query level
- Organization creator should automatically become an admin member
- Test factories will speed up writing tests for all other routers

---

**Template Version**: 1.0
**Last Updated**: 2025-11-08
