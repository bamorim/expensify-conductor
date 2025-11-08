import { describe, it, expect, beforeEach } from "vitest";
import { policyRouter } from "./policy";
import { db } from "~/server/db";
import {
  createTestUser,
  createTestOrganization,
  createMockSession,
  createTestCategory,
  createTestPolicy,
} from "~/test/factories";

describe("PolicyRouter", () => {
  beforeEach(() => {
    // Tests run in transactions, each test gets a clean database state
  });

  describe("list", () => {
    it("should return all policies for organization", async () => {
      const user = await createTestUser();
      const org = await createTestOrganization(user.id);
      const category1 = await createTestCategory(org.id, { name: "Travel" });
      const category2 = await createTestCategory(org.id, { name: "Meals" });
      
      const policy1 = await createTestPolicy(org.id, category1.id, {
        maxAmount: 50000,
      });
      const policy2 = await createTestPolicy(org.id, category2.id, {
        maxAmount: 25000,
      });

      const session = createMockSession(user);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.list({ organizationId: org.id });

      expect(result).toHaveLength(2);
      expect(result.map((p) => p.id)).toContain(policy1.id);
      expect(result.map((p) => p.id)).toContain(policy2.id);
    });

    it("should include both org-wide and user-specific policies", async () => {
      const admin = await createTestUser({ email: "admin@example.com" });
      const member = await createTestUser({ email: "member@example.com" });
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);

      await db.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: member.id,
          role: "MEMBER",
        },
      });

      const orgPolicy = await createTestPolicy(org.id, category.id);
      const userPolicy = await createTestPolicy(org.id, category.id, {
        userId: member.id,
        maxAmount: 75000,
      });

      const session = createMockSession(admin);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.list({ organizationId: org.id });

      expect(result).toHaveLength(2);
      expect(result.map((p) => p.id)).toContain(orgPolicy.id);
      expect(result.map((p) => p.id)).toContain(userPolicy.id);
      
      const foundUserPolicy = result.find((p) => p.id === userPolicy.id);
      expect(foundUserPolicy?.user).toBeTruthy();
      expect(foundUserPolicy?.userId).toBe(member.id);
    });

    it("should throw FORBIDDEN for non-members", async () => {
      const user1 = await createTestUser({ email: "user1@example.com" });
      const user2 = await createTestUser({ email: "user2@example.com" });
      const org = await createTestOrganization(user1.id);

      const session = createMockSession(user2);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.list({ organizationId: org.id }),
      ).rejects.toThrow("You are not a member of this organization");
    });
  });

  describe("getById", () => {
    it("should return policy by id for members", async () => {
      const user = await createTestUser();
      const org = await createTestOrganization(user.id);
      const category = await createTestCategory(org.id);
      const policy = await createTestPolicy(org.id, category.id, {
        maxAmount: 50000,
        period: "YEARLY",
      });

      const session = createMockSession(user);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.getById({ id: policy.id });

      expect(result.id).toBe(policy.id);
      expect(result.maxAmount).toBe(50000);
      expect(result.period).toBe("YEARLY");
    });

    it("should throw FORBIDDEN if user not member", async () => {
      const user1 = await createTestUser({ email: "user1@example.com" });
      const user2 = await createTestUser({ email: "user2@example.com" });
      const org = await createTestOrganization(user1.id);
      const category = await createTestCategory(org.id);
      const policy = await createTestPolicy(org.id, category.id);

      const session = createMockSession(user2);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(caller.getById({ id: policy.id })).rejects.toThrow(
        "You are not a member of this organization",
      );
    });

    it("should throw NOT_FOUND if policy doesn't exist", async () => {
      const user = await createTestUser();
      await createTestOrganization(user.id);

      const session = createMockSession(user);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.getById({ id: "nonexistent-id" }),
      ).rejects.toThrow("Policy not found");
    });
  });

  describe("create", () => {
    it("should create org-wide policy successfully", async () => {
      const admin = await createTestUser();
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);

      const session = createMockSession(admin);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.create({
        organizationId: org.id,
        categoryId: category.id,
        maxAmount: 100000,
        period: "MONTHLY",
        autoApprove: true,
      });

      expect(result.organizationId).toBe(org.id);
      expect(result.categoryId).toBe(category.id);
      expect(result.userId).toBeNull();
      expect(result.maxAmount).toBe(100000);
      expect(result.period).toBe("MONTHLY");
      expect(result.autoApprove).toBe(true);
    });

    it("should create user-specific policy successfully", async () => {
      const admin = await createTestUser({ email: "admin@example.com" });
      const member = await createTestUser({ email: "member@example.com" });
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);

      await db.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: member.id,
          role: "MEMBER",
        },
      });

      const session = createMockSession(admin);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.create({
        organizationId: org.id,
        categoryId: category.id,
        userId: member.id,
        maxAmount: 50000,
        period: "YEARLY",
        autoApprove: false,
      });

      expect(result.userId).toBe(member.id);
      expect(result.maxAmount).toBe(50000);
      expect(result.period).toBe("YEARLY");
    });

    it("should throw FORBIDDEN if user not admin", async () => {
      const admin = await createTestUser({ email: "admin@example.com" });
      const member = await createTestUser({ email: "member@example.com" });
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);

      await db.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: member.id,
          role: "MEMBER",
        },
      });

      const session = createMockSession(member);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.create({
          organizationId: org.id,
          categoryId: category.id,
          maxAmount: 50000,
          period: "MONTHLY",
          autoApprove: false,
        }),
      ).rejects.toThrow("Only admins can create policies");
    });

    it("should throw NOT_FOUND if category doesn't exist", async () => {
      const admin = await createTestUser();
      const org = await createTestOrganization(admin.id);

      const session = createMockSession(admin);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.create({
          organizationId: org.id,
          categoryId: "nonexistent-category",
          maxAmount: 50000,
          period: "MONTHLY",
          autoApprove: false,
        }),
      ).rejects.toThrow("Category not found in this organization");
    });

    it("should throw NOT_FOUND if category belongs to different org", async () => {
      const admin1 = await createTestUser({ email: "admin1@example.com" });
      const admin2 = await createTestUser({ email: "admin2@example.com" });
      const org1 = await createTestOrganization(admin1.id);
      const org2 = await createTestOrganization(admin2.id);
      const category = await createTestCategory(org1.id);

      const session = createMockSession(admin2);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.create({
          organizationId: org2.id,
          categoryId: category.id,
          maxAmount: 50000,
          period: "MONTHLY",
          autoApprove: false,
        }),
      ).rejects.toThrow("Category not found in this organization");
    });

    it("should throw NOT_FOUND if userId provided but user not in org", async () => {
      const admin = await createTestUser({ email: "admin@example.com" });
      const otherUser = await createTestUser({ email: "other@example.com" });
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);

      const session = createMockSession(admin);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.create({
          organizationId: org.id,
          categoryId: category.id,
          userId: otherUser.id,
          maxAmount: 50000,
          period: "MONTHLY",
          autoApprove: false,
        }),
      ).rejects.toThrow("User is not a member of this organization");
    });

    it("should throw validation error if maxAmount <= 0", async () => {
      const admin = await createTestUser();
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);

      const session = createMockSession(admin);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.create({
          organizationId: org.id,
          categoryId: category.id,
          maxAmount: 0,
          period: "MONTHLY",
          autoApprove: false,
        }),
      ).rejects.toThrow();
    });

    it("should throw validation error if invalid period", async () => {
      const admin = await createTestUser();
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);

      const session = createMockSession(admin);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.create({
          organizationId: org.id,
          categoryId: category.id,
          maxAmount: 50000,
          period: "INVALID" as "MONTHLY",
          autoApprove: false,
        }),
      ).rejects.toThrow();
    });
  });

  describe("update", () => {
    it("should update policy successfully", async () => {
      const admin = await createTestUser();
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);
      const policy = await createTestPolicy(org.id, category.id, {
        maxAmount: 50000,
        period: "MONTHLY",
        autoApprove: false,
      });

      const session = createMockSession(admin);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.update({
        id: policy.id,
        maxAmount: 75000,
        period: "YEARLY",
        autoApprove: true,
      });

      expect(result.maxAmount).toBe(75000);
      expect(result.period).toBe("YEARLY");
      expect(result.autoApprove).toBe(true);
    });

    it("should throw FORBIDDEN if user not admin", async () => {
      const admin = await createTestUser({ email: "admin@example.com" });
      const member = await createTestUser({ email: "member@example.com" });
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);
      const policy = await createTestPolicy(org.id, category.id);

      await db.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: member.id,
          role: "MEMBER",
        },
      });

      const session = createMockSession(member);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.update({
          id: policy.id,
          maxAmount: 75000,
          period: "YEARLY",
          autoApprove: true,
        }),
      ).rejects.toThrow("Only admins can update policies");
    });

    it("should throw NOT_FOUND if policy doesn't exist", async () => {
      const admin = await createTestUser();
      await createTestOrganization(admin.id);

      const session = createMockSession(admin);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.update({
          id: "nonexistent-id",
          maxAmount: 75000,
          period: "YEARLY",
          autoApprove: true,
        }),
      ).rejects.toThrow("Policy not found");
    });

    it("should throw validation error if new maxAmount <= 0", async () => {
      const admin = await createTestUser();
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);
      const policy = await createTestPolicy(org.id, category.id);

      const session = createMockSession(admin);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.update({
          id: policy.id,
          maxAmount: -100,
          period: "YEARLY",
          autoApprove: true,
        }),
      ).rejects.toThrow();
    });
  });

  describe("delete", () => {
    it("should delete policy successfully", async () => {
      const admin = await createTestUser();
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);
      const policy = await createTestPolicy(org.id, category.id);

      const session = createMockSession(admin);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.delete({ id: policy.id });

      expect(result.id).toBe(policy.id);

      const deletedPolicy = await db.policy.findUnique({
        where: { id: policy.id },
      });

      expect(deletedPolicy).toBeNull();
    });

    it("should throw FORBIDDEN if user not admin", async () => {
      const admin = await createTestUser({ email: "admin@example.com" });
      const member = await createTestUser({ email: "member@example.com" });
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);
      const policy = await createTestPolicy(org.id, category.id);

      await db.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: member.id,
          role: "MEMBER",
        },
      });

      const session = createMockSession(member);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(caller.delete({ id: policy.id })).rejects.toThrow(
        "Only admins can delete policies",
      );
    });

    it("should throw NOT_FOUND if policy doesn't exist", async () => {
      const admin = await createTestUser();
      await createTestOrganization(admin.id);

      const session = createMockSession(admin);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(caller.delete({ id: "nonexistent-id" })).rejects.toThrow(
        "Policy not found",
      );
    });
  });

  describe("resolvePolicy", () => {
    it("should return user-specific policy when it exists", async () => {
      const admin = await createTestUser({ email: "admin@example.com" });
      const member = await createTestUser({ email: "member@example.com" });
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);

      await db.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: member.id,
          role: "MEMBER",
        },
      });

      await createTestPolicy(org.id, category.id, {
        maxAmount: 50000,
      });

      const userPolicy = await createTestPolicy(org.id, category.id, {
        userId: member.id,
        maxAmount: 75000,
      });

      const session = createMockSession(admin);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.resolvePolicy({
        organizationId: org.id,
        userId: member.id,
        categoryId: category.id,
      });

      expect(result.id).toBe(userPolicy.id);
      expect(result.maxAmount).toBe(75000);
    });

    it("should return org-wide policy when no user-specific exists", async () => {
      const admin = await createTestUser({ email: "admin@example.com" });
      const member = await createTestUser({ email: "member@example.com" });
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);

      await db.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: member.id,
          role: "MEMBER",
        },
      });

      const orgPolicy = await createTestPolicy(org.id, category.id, {
        maxAmount: 50000,
      });

      const session = createMockSession(admin);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.resolvePolicy({
        organizationId: org.id,
        userId: member.id,
        categoryId: category.id,
      });

      expect(result.id).toBe(orgPolicy.id);
      expect(result.maxAmount).toBe(50000);
    });

    it("should throw NOT_FOUND when no policy exists", async () => {
      const admin = await createTestUser({ email: "admin@example.com" });
      const member = await createTestUser({ email: "member@example.com" });
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);

      await db.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: member.id,
          role: "MEMBER",
        },
      });

      const session = createMockSession(admin);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.resolvePolicy({
          organizationId: org.id,
          userId: member.id,
          categoryId: category.id,
        }),
      ).rejects.toThrow("No policy found for this user and category");
    });

    it("should return correct policy for different categories", async () => {
      const admin = await createTestUser({ email: "admin@example.com" });
      const member = await createTestUser({ email: "member@example.com" });
      const org = await createTestOrganization(admin.id);
      const category1 = await createTestCategory(org.id, { name: "Travel" });
      const category2 = await createTestCategory(org.id, { name: "Meals" });

      await db.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: member.id,
          role: "MEMBER",
        },
      });

      const policy1 = await createTestPolicy(org.id, category1.id, {
        maxAmount: 50000,
      });

      const policy2 = await createTestPolicy(org.id, category2.id, {
        maxAmount: 25000,
      });

      const session = createMockSession(admin);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result1 = await caller.resolvePolicy({
        organizationId: org.id,
        userId: member.id,
        categoryId: category1.id,
      });

      const result2 = await caller.resolvePolicy({
        organizationId: org.id,
        userId: member.id,
        categoryId: category2.id,
      });

      expect(result1.id).toBe(policy1.id);
      expect(result1.maxAmount).toBe(50000);
      expect(result2.id).toBe(policy2.id);
      expect(result2.maxAmount).toBe(25000);
    });

    it("should return correct policy for multiple users", async () => {
      const admin = await createTestUser({ email: "admin@example.com" });
      const member1 = await createTestUser({ email: "member1@example.com" });
      const member2 = await createTestUser({ email: "member2@example.com" });
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);

      await db.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: member1.id,
          role: "MEMBER",
        },
      });

      await db.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: member2.id,
          role: "MEMBER",
        },
      });

      await createTestPolicy(org.id, category.id, {
        maxAmount: 50000,
      });

      const member2Policy = await createTestPolicy(org.id, category.id, {
        userId: member2.id,
        maxAmount: 100000,
      });

      const session = createMockSession(admin);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result1 = await caller.resolvePolicy({
        organizationId: org.id,
        userId: member1.id,
        categoryId: category.id,
      });

      const result2 = await caller.resolvePolicy({
        organizationId: org.id,
        userId: member2.id,
        categoryId: category.id,
      });

      expect(result1.maxAmount).toBe(50000);
      expect(result2.id).toBe(member2Policy.id);
      expect(result2.maxAmount).toBe(100000);
    });

    it("should return correct policy across multiple orgs", async () => {
      const admin1 = await createTestUser({ email: "admin1@example.com" });
      const admin2 = await createTestUser({ email: "admin2@example.com" });
      const org1 = await createTestOrganization(admin1.id);
      const org2 = await createTestOrganization(admin2.id);
      const category1 = await createTestCategory(org1.id);
      const category2 = await createTestCategory(org2.id);

      const policy1 = await createTestPolicy(org1.id, category1.id, {
        maxAmount: 30000,
      });

      const policy2 = await createTestPolicy(org2.id, category2.id, {
        maxAmount: 60000,
      });

      const session1 = createMockSession(admin1);
      const caller1 = policyRouter.createCaller({
        db,
        session: session1,
        headers: new Headers(),
      });

      const session2 = createMockSession(admin2);
      const caller2 = policyRouter.createCaller({
        db,
        session: session2,
        headers: new Headers(),
      });

      const result1 = await caller1.resolvePolicy({
        organizationId: org1.id,
        userId: admin1.id,
        categoryId: category1.id,
      });

      const result2 = await caller2.resolvePolicy({
        organizationId: org2.id,
        userId: admin2.id,
        categoryId: category2.id,
      });

      expect(result1.id).toBe(policy1.id);
      expect(result1.maxAmount).toBe(30000);
      expect(result2.id).toBe(policy2.id);
      expect(result2.maxAmount).toBe(60000);
    });

    it("should throw FORBIDDEN for non-members", async () => {
      const user1 = await createTestUser({ email: "user1@example.com" });
      const user2 = await createTestUser({ email: "user2@example.com" });
      const org = await createTestOrganization(user1.id);
      const category = await createTestCategory(org.id);

      const session = createMockSession(user2);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.resolvePolicy({
          organizationId: org.id,
          userId: user1.id,
          categoryId: category.id,
        }),
      ).rejects.toThrow("You are not a member of this organization");
    });
  });

  describe("debugPolicy", () => {
    it("should show user-specific policy when it exists", async () => {
      const admin = await createTestUser({ email: "admin@example.com" });
      const member = await createTestUser({ email: "member@example.com" });
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);

      await db.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: member.id,
          role: "MEMBER",
        },
      });

      const orgPolicy = await createTestPolicy(org.id, category.id, {
        maxAmount: 50000,
      });

      const userPolicy = await createTestPolicy(org.id, category.id, {
        userId: member.id,
        maxAmount: 75000,
      });

      const session = createMockSession(admin);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.debugPolicy({
        organizationId: org.id,
        userId: member.id,
        categoryId: category.id,
      });

      expect(result.userSpecificPolicy?.id).toBe(userPolicy.id);
      expect(result.organizationPolicy?.id).toBe(orgPolicy.id);
      expect(result.selectedPolicy?.id).toBe(userPolicy.id);
      expect(result.reason).toContain("User-specific policy takes precedence");
    });

    it("should show org-wide policy when user-specific doesn't exist", async () => {
      const admin = await createTestUser({ email: "admin@example.com" });
      const member = await createTestUser({ email: "member@example.com" });
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);

      await db.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: member.id,
          role: "MEMBER",
        },
      });

      const orgPolicy = await createTestPolicy(org.id, category.id, {
        maxAmount: 50000,
      });

      const session = createMockSession(admin);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.debugPolicy({
        organizationId: org.id,
        userId: member.id,
        categoryId: category.id,
      });

      expect(result.userSpecificPolicy).toBeNull();
      expect(result.organizationPolicy?.id).toBe(orgPolicy.id);
      expect(result.selectedPolicy?.id).toBe(orgPolicy.id);
      expect(result.reason).toContain(
        "No user-specific policy found, using organization-wide policy",
      );
    });

    it("should show both when both exist and explain precedence", async () => {
      const admin = await createTestUser({ email: "admin@example.com" });
      const member = await createTestUser({ email: "member@example.com" });
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);

      await db.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: member.id,
          role: "MEMBER",
        },
      });

      const orgPolicy = await createTestPolicy(org.id, category.id, {
        maxAmount: 50000,
      });

      const userPolicy = await createTestPolicy(org.id, category.id, {
        userId: member.id,
        maxAmount: 75000,
      });

      const session = createMockSession(admin);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.debugPolicy({
        organizationId: org.id,
        userId: member.id,
        categoryId: category.id,
      });

      expect(result.userSpecificPolicy?.id).toBe(userPolicy.id);
      expect(result.organizationPolicy?.id).toBe(orgPolicy.id);
      expect(result.selectedPolicy?.id).toBe(userPolicy.id);
      expect(result.reason).toContain("User-specific policy takes precedence");
    });

    it("should show helpful message when no policy found", async () => {
      const admin = await createTestUser({ email: "admin@example.com" });
      const member = await createTestUser({ email: "member@example.com" });
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);

      await db.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: member.id,
          role: "MEMBER",
        },
      });

      const session = createMockSession(admin);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.debugPolicy({
        organizationId: org.id,
        userId: member.id,
        categoryId: category.id,
      });

      expect(result.userSpecificPolicy).toBeNull();
      expect(result.organizationPolicy).toBeNull();
      expect(result.selectedPolicy).toBeNull();
      expect(result.reason).toContain(
        "No policy found for this user and category combination",
      );
    });

    it("should throw FORBIDDEN for non-members", async () => {
      const user1 = await createTestUser({ email: "user1@example.com" });
      const user2 = await createTestUser({ email: "user2@example.com" });
      const org = await createTestOrganization(user1.id);
      const category = await createTestCategory(org.id);

      const session = createMockSession(user2);
      const caller = policyRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.debugPolicy({
          organizationId: org.id,
          userId: user1.id,
          categoryId: category.id,
        }),
      ).rejects.toThrow("You are not a member of this organization");
    });
  });
});
