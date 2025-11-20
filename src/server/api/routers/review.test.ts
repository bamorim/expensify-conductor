import { describe, it, expect, beforeEach, vi } from "vitest";
import { reviewRouter } from "./review";
import { db } from "~/server/db";
import {
  createMockSession,
  createTestUser,
  createTestOrganization,
  createTestCategory,
  createTestExpense,
} from "~/test/factories";

describe("reviewRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("approve", () => {
    it("should allow admin to approve submitted expense", async () => {
      const admin = await createTestUser({ name: "Admin User" });
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);
      const expense = await createTestExpense(org.id, admin.id, category.id);

      const session = createMockSession(admin);
      const caller = reviewRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.approve({
        expenseId: expense.id,
        comment: "Looks good",
      });

      expect(result.status).toBe("APPROVED");
      expect(result.id).toBe(expense.id);

      const review = await db.expenseReview.findFirst({
        where: { expenseId: expense.id },
      });
      expect(review).toBeDefined();
      expect(review?.status).toBe("APPROVED");
      expect(review?.reviewerId).toBe(admin.id);
      expect(review?.comment).toBe("Looks good");
    });

    it("should allow admin to approve without comment", async () => {
      const admin = await createTestUser({ name: "Admin User" });
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);
      const expense = await createTestExpense(org.id, admin.id, category.id);

      const session = createMockSession(admin);
      const caller = reviewRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.approve({
        expenseId: expense.id,
      });

      expect(result.status).toBe("APPROVED");

      const review = await db.expenseReview.findFirst({
        where: { expenseId: expense.id },
      });
      expect(review).toBeDefined();
      expect(review?.status).toBe("APPROVED");
      expect(review?.comment).toBeNull();
    });

    it("should not allow non-admin to approve expense", async () => {
      const admin = await createTestUser({ name: "Admin User" });
      const member = await createTestUser({ name: "Member User" });
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);
      const expense = await createTestExpense(org.id, admin.id, category.id);

      await db.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: member.id,
          role: "MEMBER",
        },
      });

      const session = createMockSession(member);
      const caller = reviewRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.approve({
          expenseId: expense.id,
        })
      ).rejects.toThrow("Only admins can approve expenses");
    });

    it("should not allow user from different org to approve expense", async () => {
      const admin1 = await createTestUser({ name: "Admin 1" });
      const admin2 = await createTestUser({ name: "Admin 2" });
      const org1 = await createTestOrganization(admin1.id);
      await createTestOrganization(admin2.id);
      const category = await createTestCategory(org1.id);
      const expense = await createTestExpense(org1.id, admin1.id, category.id);

      const session = createMockSession(admin2);
      const caller = reviewRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.approve({
          expenseId: expense.id,
        })
      ).rejects.toThrow("Only admins can approve expenses");
    });

    it("should not allow approving already approved expense", async () => {
      const admin = await createTestUser({ name: "Admin User" });
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);
      const expense = await createTestExpense(org.id, admin.id, category.id);

      await db.expense.update({
        where: { id: expense.id },
        data: { status: "APPROVED" },
      });

      const session = createMockSession(admin);
      const caller = reviewRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.approve({
          expenseId: expense.id,
        })
      ).rejects.toThrow("Only submitted expenses can be approved");
    });

    it("should not allow approving already rejected expense", async () => {
      const admin = await createTestUser({ name: "Admin User" });
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);
      const expense = await createTestExpense(org.id, admin.id, category.id);

      await db.expense.update({
        where: { id: expense.id },
        data: { status: "REJECTED" },
      });

      const session = createMockSession(admin);
      const caller = reviewRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.approve({
          expenseId: expense.id,
        })
      ).rejects.toThrow("Only submitted expenses can be approved");
    });

    it("should fail if expense does not exist", async () => {
      const admin = await createTestUser({ name: "Admin User" });
      await createTestOrganization(admin.id);

      const session = createMockSession(admin);
      const caller = reviewRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.approve({
          expenseId: "non-existent-id",
        })
      ).rejects.toThrow("Expense not found");
    });
  });

  describe("reject", () => {
    it("should allow admin to reject submitted expense", async () => {
      const admin = await createTestUser({ name: "Admin User" });
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);
      const expense = await createTestExpense(org.id, admin.id, category.id);

      const session = createMockSession(admin);
      const caller = reviewRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.reject({
        expenseId: expense.id,
        comment: "Missing receipt",
      });

      expect(result.status).toBe("REJECTED");
      expect(result.id).toBe(expense.id);

      const review = await db.expenseReview.findFirst({
        where: { expenseId: expense.id },
      });
      expect(review).toBeDefined();
      expect(review?.status).toBe("REJECTED");
      expect(review?.reviewerId).toBe(admin.id);
      expect(review?.comment).toBe("Missing receipt");
    });

    it("should allow admin to reject without comment", async () => {
      const admin = await createTestUser({ name: "Admin User" });
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);
      const expense = await createTestExpense(org.id, admin.id, category.id);

      const session = createMockSession(admin);
      const caller = reviewRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.reject({
        expenseId: expense.id,
      });

      expect(result.status).toBe("REJECTED");

      const review = await db.expenseReview.findFirst({
        where: { expenseId: expense.id },
      });
      expect(review).toBeDefined();
      expect(review?.status).toBe("REJECTED");
      expect(review?.comment).toBeNull();
    });

    it("should not allow non-admin to reject expense", async () => {
      const admin = await createTestUser({ name: "Admin User" });
      const member = await createTestUser({ name: "Member User" });
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);
      const expense = await createTestExpense(org.id, admin.id, category.id);

      await db.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: member.id,
          role: "MEMBER",
        },
      });

      const session = createMockSession(member);
      const caller = reviewRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.reject({
          expenseId: expense.id,
        })
      ).rejects.toThrow("Only admins can reject expenses");
    });

    it("should not allow user from different org to reject expense", async () => {
      const admin1 = await createTestUser({ name: "Admin 1" });
      const admin2 = await createTestUser({ name: "Admin 2" });
      const org1 = await createTestOrganization(admin1.id);
      await createTestOrganization(admin2.id);
      const category = await createTestCategory(org1.id);
      const expense = await createTestExpense(org1.id, admin1.id, category.id);

      const session = createMockSession(admin2);
      const caller = reviewRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.reject({
          expenseId: expense.id,
        })
      ).rejects.toThrow("Only admins can reject expenses");
    });

    it("should not allow rejecting already approved expense", async () => {
      const admin = await createTestUser({ name: "Admin User" });
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);
      const expense = await createTestExpense(org.id, admin.id, category.id);

      await db.expense.update({
        where: { id: expense.id },
        data: { status: "APPROVED" },
      });

      const session = createMockSession(admin);
      const caller = reviewRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.reject({
          expenseId: expense.id,
        })
      ).rejects.toThrow("Only submitted expenses can be rejected");
    });

    it("should not allow rejecting already rejected expense", async () => {
      const admin = await createTestUser({ name: "Admin User" });
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);
      const expense = await createTestExpense(org.id, admin.id, category.id);

      await db.expense.update({
        where: { id: expense.id },
        data: { status: "REJECTED" },
      });

      const session = createMockSession(admin);
      const caller = reviewRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.reject({
          expenseId: expense.id,
        })
      ).rejects.toThrow("Only submitted expenses can be rejected");
    });

    it("should fail if expense does not exist", async () => {
      const admin = await createTestUser({ name: "Admin User" });
      await createTestOrganization(admin.id);

      const session = createMockSession(admin);
      const caller = reviewRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.reject({
          expenseId: "non-existent-id",
        })
      ).rejects.toThrow("Expense not found");
    });
  });

  describe("listPending", () => {
    it("should allow admin to list pending expenses", async () => {
      const admin = await createTestUser({ name: "Admin User" });
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);
      
      const expense1 = await createTestExpense(org.id, admin.id, category.id, {
        description: "Expense 1",
      });
      const expense2 = await createTestExpense(org.id, admin.id, category.id, {
        description: "Expense 2",
      });

      const session = createMockSession(admin);
      const caller = reviewRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.listPending({
        organizationId: org.id,
      });

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe(expense1.id);
      expect(result[1]?.id).toBe(expense2.id);
      expect(result[0]?.user).toBeDefined();
      expect(result[0]?.category).toBeDefined();
    });

    it("should only return submitted expenses", async () => {
      const admin = await createTestUser({ name: "Admin User" });
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);
      
      const submittedExpense = await createTestExpense(org.id, admin.id, category.id, {
        description: "Submitted",
      });
      const approvedExpense = await createTestExpense(org.id, admin.id, category.id, {
        description: "Approved",
      });
      const rejectedExpense = await createTestExpense(org.id, admin.id, category.id, {
        description: "Rejected",
      });

      await db.expense.update({
        where: { id: approvedExpense.id },
        data: { status: "APPROVED" },
      });
      await db.expense.update({
        where: { id: rejectedExpense.id },
        data: { status: "REJECTED" },
      });

      const session = createMockSession(admin);
      const caller = reviewRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.listPending({
        organizationId: org.id,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(submittedExpense.id);
    });

    it("should order by creation date ascending", async () => {
      const admin = await createTestUser({ name: "Admin User" });
      const org = await createTestOrganization(admin.id);
      const category = await createTestCategory(org.id);
      
      const oldExpense = await createTestExpense(org.id, admin.id, category.id, {
        description: "Old expense",
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const newExpense = await createTestExpense(org.id, admin.id, category.id, {
        description: "New expense",
      });

      const session = createMockSession(admin);
      const caller = reviewRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.listPending({
        organizationId: org.id,
      });

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe(oldExpense.id);
      expect(result[1]?.id).toBe(newExpense.id);
    });

    it("should not allow non-admin to list pending expenses", async () => {
      const admin = await createTestUser({ name: "Admin User" });
      const member = await createTestUser({ name: "Member User" });
      const org = await createTestOrganization(admin.id);

      await db.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: member.id,
          role: "MEMBER",
        },
      });

      const session = createMockSession(member);
      const caller = reviewRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.listPending({
          organizationId: org.id,
        })
      ).rejects.toThrow("Only admins can list pending expenses");
    });

    it("should not allow user from different org to list pending expenses", async () => {
      const admin1 = await createTestUser({ name: "Admin 1" });
      const admin2 = await createTestUser({ name: "Admin 2" });
      const org1 = await createTestOrganization(admin1.id);
      await createTestOrganization(admin2.id);

      const session = createMockSession(admin2);
      const caller = reviewRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.listPending({
          organizationId: org1.id,
        })
      ).rejects.toThrow("Only admins can list pending expenses");
    });

    it("should return empty array when no pending expenses", async () => {
      const admin = await createTestUser({ name: "Admin User" });
      const org = await createTestOrganization(admin.id);

      const session = createMockSession(admin);
      const caller = reviewRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.listPending({
        organizationId: org.id,
      });

      expect(result).toEqual([]);
    });
  });
});
