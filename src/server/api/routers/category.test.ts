import { describe, it, expect, vi, beforeEach } from "vitest";
import { categoryRouter } from "./category";
import { db } from "~/server/db";
import {
  createTestUser,
  createTestOrganization,
  createTestCategory,
  createMockSession,
} from "~/test/factories";

describe("CategoryRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("should return all categories for organization ordered by name", async () => {
      const user = await createTestUser();
      const org = await createTestOrganization(user.id);

      await createTestCategory(org.id, { name: "Travel" });
      await createTestCategory(org.id, { name: "Meals" });
      await createTestCategory(org.id, { name: "Office Supplies" });

      const session = createMockSession(user);
      const caller = categoryRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.list({ organizationId: org.id });

      expect(result).toHaveLength(3);
      expect(result[0]?.name).toBe("Meals");
      expect(result[1]?.name).toBe("Office Supplies");
      expect(result[2]?.name).toBe("Travel");
    });

    it("should filter by organization and not return other org's categories", async () => {
      const user1 = await createTestUser({ email: "user1@example.com" });
      const user2 = await createTestUser({ email: "user2@example.com" });
      const org1 = await createTestOrganization(user1.id, { name: "Org 1" });
      const org2 = await createTestOrganization(user2.id, { name: "Org 2" });

      await createTestCategory(org1.id, { name: "Category 1" });
      await createTestCategory(org2.id, { name: "Category 2" });

      const session = createMockSession(user1);
      const caller = categoryRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.list({ organizationId: org1.id });

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Category 1");
    });

    it("should throw FORBIDDEN for non-members", async () => {
      const user1 = await createTestUser({ email: "user1@example.com" });
      const user2 = await createTestUser({ email: "user2@example.com" });
      const org = await createTestOrganization(user1.id);

      const session = createMockSession(user2);
      const caller = categoryRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(caller.list({ organizationId: org.id })).rejects.toThrow(
        "You are not a member of this organization",
      );
    });
  });

  describe("getById", () => {
    it("should return category by id for members", async () => {
      const user = await createTestUser();
      const org = await createTestOrganization(user.id);
      const category = await createTestCategory(org.id, {
        name: "Travel",
        description: "Travel expenses",
      });

      const session = createMockSession(user);
      const caller = categoryRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.getById({ id: category.id });

      expect(result.id).toBe(category.id);
      expect(result.name).toBe("Travel");
      expect(result.description).toBe("Travel expenses");
      expect(result.organization).toBeDefined();
    });

    it("should throw FORBIDDEN if user not member of org", async () => {
      const user1 = await createTestUser({ email: "user1@example.com" });
      const user2 = await createTestUser({ email: "user2@example.com" });
      const org = await createTestOrganization(user1.id);
      const category = await createTestCategory(org.id);

      const session = createMockSession(user2);
      const caller = categoryRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(caller.getById({ id: category.id })).rejects.toThrow(
        "You are not a member of this organization",
      );
    });

    it("should throw NOT_FOUND if category doesn't exist", async () => {
      const user = await createTestUser();
      const session = createMockSession(user);
      const caller = categoryRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.getById({ id: "non-existent-id" }),
      ).rejects.toThrow("Category not found");
    });
  });

  describe("create", () => {
    it("should create category successfully as admin", async () => {
      const user = await createTestUser();
      const org = await createTestOrganization(user.id);

      const session = createMockSession(user);
      const caller = categoryRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.create({
        organizationId: org.id,
        name: "Meals",
        description: "Food and beverages",
      });

      expect(result.name).toBe("Meals");
      expect(result.description).toBe("Food and beverages");
      expect(result.organizationId).toBe(org.id);
    });

    it("should throw FORBIDDEN if user not admin", async () => {
      const admin = await createTestUser({ email: "admin@example.com" });
      const member = await createTestUser({ email: "member@example.com" });
      const org = await createTestOrganization(admin.id);

      await db.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: member.id,
          role: "MEMBER",
        },
      });

      const session = createMockSession(member);
      const caller = categoryRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.create({
          organizationId: org.id,
          name: "Travel",
        }),
      ).rejects.toThrow("Only admins can create categories");
    });

    it("should throw FORBIDDEN if user not member", async () => {
      const user1 = await createTestUser({ email: "user1@example.com" });
      const user2 = await createTestUser({ email: "user2@example.com" });
      const org = await createTestOrganization(user1.id);

      const session = createMockSession(user2);
      const caller = categoryRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.create({
          organizationId: org.id,
          name: "Travel",
        }),
      ).rejects.toThrow("Only admins can create categories");
    });

    it("should throw CONFLICT if name already exists in org", async () => {
      const user = await createTestUser();
      const org = await createTestOrganization(user.id);
      await createTestCategory(org.id, { name: "Travel" });

      const session = createMockSession(user);
      const caller = categoryRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.create({
          organizationId: org.id,
          name: "Travel",
        }),
      ).rejects.toThrow("Category name already exists in this organization");
    });

    it("should allow same name in different organizations", async () => {
      const user1 = await createTestUser({ email: "user1@example.com" });
      const user2 = await createTestUser({ email: "user2@example.com" });
      const org1 = await createTestOrganization(user1.id);
      const org2 = await createTestOrganization(user2.id);
      await createTestCategory(org1.id, { name: "Travel" });

      const session = createMockSession(user2);
      const caller = categoryRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.create({
        organizationId: org2.id,
        name: "Travel",
      });

      expect(result.name).toBe("Travel");
      expect(result.organizationId).toBe(org2.id);
    });
  });

  describe("update", () => {
    it("should update category successfully as admin", async () => {
      const user = await createTestUser();
      const org = await createTestOrganization(user.id);
      const category = await createTestCategory(org.id, {
        name: "Old Name",
        description: "Old description",
      });

      const session = createMockSession(user);
      const caller = categoryRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.update({
        id: category.id,
        name: "New Name",
        description: "New description",
      });

      expect(result.name).toBe("New Name");
      expect(result.description).toBe("New description");
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
      const caller = categoryRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.update({
          id: category.id,
          name: "New Name",
        }),
      ).rejects.toThrow("Only admins can update categories");
    });

    it("should throw FORBIDDEN if user not member", async () => {
      const user1 = await createTestUser({ email: "user1@example.com" });
      const user2 = await createTestUser({ email: "user2@example.com" });
      const org = await createTestOrganization(user1.id);
      const category = await createTestCategory(org.id);

      const session = createMockSession(user2);
      const caller = categoryRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.update({
          id: category.id,
          name: "New Name",
        }),
      ).rejects.toThrow("Only admins can update categories");
    });

    it("should throw CONFLICT if name already exists in different category", async () => {
      const user = await createTestUser();
      const org = await createTestOrganization(user.id);
      await createTestCategory(org.id, { name: "Travel" });
      const category2 = await createTestCategory(org.id, { name: "Meals" });

      const session = createMockSession(user);
      const caller = categoryRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.update({
          id: category2.id,
          name: "Travel",
        }),
      ).rejects.toThrow("Category name already exists in this organization");
    });

    it("should allow updating with same name (same category)", async () => {
      const user = await createTestUser();
      const org = await createTestOrganization(user.id);
      const category = await createTestCategory(org.id, {
        name: "Travel",
        description: "Old description",
      });

      const session = createMockSession(user);
      const caller = categoryRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.update({
        id: category.id,
        name: "Travel",
        description: "New description",
      });

      expect(result.name).toBe("Travel");
      expect(result.description).toBe("New description");
    });

    it("should throw NOT_FOUND if category doesn't exist", async () => {
      const user = await createTestUser();
      const session = createMockSession(user);
      const caller = categoryRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.update({
          id: "non-existent-id",
          name: "New Name",
        }),
      ).rejects.toThrow("Category not found");
    });
  });

  describe("delete", () => {
    it("should delete category successfully as admin", async () => {
      const user = await createTestUser();
      const org = await createTestOrganization(user.id);
      const category = await createTestCategory(org.id, { name: "Travel" });

      const session = createMockSession(user);
      const caller = categoryRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.delete({ id: category.id });

      expect(result.success).toBe(true);

      const deletedCategory = await db.expenseCategory.findUnique({
        where: { id: category.id },
      });

      expect(deletedCategory).toBeNull();
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
      const caller = categoryRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(caller.delete({ id: category.id })).rejects.toThrow(
        "Only admins can delete categories",
      );
    });

    it("should throw FORBIDDEN if user not member", async () => {
      const user1 = await createTestUser({ email: "user1@example.com" });
      const user2 = await createTestUser({ email: "user2@example.com" });
      const org = await createTestOrganization(user1.id);
      const category = await createTestCategory(org.id);

      const session = createMockSession(user2);
      const caller = categoryRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(caller.delete({ id: category.id })).rejects.toThrow(
        "Only admins can delete categories",
      );
    });

    it("should throw NOT_FOUND if category doesn't exist", async () => {
      const user = await createTestUser();
      const session = createMockSession(user);
      const caller = categoryRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.delete({ id: "non-existent-id" }),
      ).rejects.toThrow("Category not found");
    });
  });
});
