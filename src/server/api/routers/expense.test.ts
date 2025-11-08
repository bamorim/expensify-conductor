import { describe, it, expect, beforeEach } from "vitest";
import { expenseRouter } from "./expense";
import { db } from "~/server/db";
import {
  createTestUser,
  createTestOrganization,
  createMockSession,
  createTestCategory,
  createTestPolicy,
  createTestExpense,
} from "~/test/factories";
import { TRPCError } from "@trpc/server";

describe("ExpenseRouter", () => {
  beforeEach(() => {
  });

  describe("submit", () => {
    it("should auto-reject expense over policy limit", async () => {
      const user = await createTestUser();
      const org = await createTestOrganization(user.id);
      const category = await createTestCategory(org.id, { name: "Travel" });
      await createTestPolicy(org.id, category.id, {
        maxAmount: 50000,
        autoApprove: false,
      });

      const session = createMockSession(user);
      const caller = expenseRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.submit({
        organizationId: org.id,
        categoryId: category.id,
        amount: 75000,
        date: new Date(),
        description: "Over limit expense",
      });

      expect(result.expense.status).toBe("REJECTED");
      expect(result.message).toContain("auto-rejected");
      expect(result.message).toContain("50000");

      const reviews = await db.expenseReview.findMany({
        where: { expenseId: result.expense.id },
      });
      expect(reviews).toHaveLength(1);
      expect(reviews[0]?.status).toBe("REJECTED");
      expect(reviews[0]?.comment).toContain("exceeds policy limit");
    });

    it("should auto-approve compliant expense with autoApprove=true", async () => {
      const user = await createTestUser();
      const org = await createTestOrganization(user.id);
      const category = await createTestCategory(org.id, { name: "Meals" });
      await createTestPolicy(org.id, category.id, {
        maxAmount: 50000,
        autoApprove: true,
      });

      const session = createMockSession(user);
      const caller = expenseRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.submit({
        organizationId: org.id,
        categoryId: category.id,
        amount: 30000,
        date: new Date(),
        description: "Compliant expense",
      });

      expect(result.expense.status).toBe("APPROVED");
      expect(result.message).toBe("Expense auto-approved");

      const reviews = await db.expenseReview.findMany({
        where: { expenseId: result.expense.id },
      });
      expect(reviews).toHaveLength(1);
      expect(reviews[0]?.status).toBe("APPROVED");
      expect(reviews[0]?.comment).toBe("Auto-approved by policy");
    });

    it("should submit for manual review when autoApprove=false", async () => {
      const user = await createTestUser();
      const org = await createTestOrganization(user.id);
      const category = await createTestCategory(org.id, { name: "Office" });
      await createTestPolicy(org.id, category.id, {
        maxAmount: 100000,
        autoApprove: false,
      });

      const session = createMockSession(user);
      const caller = expenseRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.submit({
        organizationId: org.id,
        categoryId: category.id,
        amount: 50000,
        date: new Date(),
        description: "Needs review",
      });

      expect(result.expense.status).toBe("SUBMITTED");
      expect(result.message).toBe("Expense submitted for review");

      const reviews = await db.expenseReview.findMany({
        where: { expenseId: result.expense.id },
      });
      expect(reviews).toHaveLength(1);
      expect(reviews[0]?.status).toBe("SUBMITTED");
      expect(reviews[0]?.comment).toBe("Awaiting manual review");
    });

    it("should default to manual review when no policy found", async () => {
      const user = await createTestUser();
      const org = await createTestOrganization(user.id);
      const category = await createTestCategory(org.id, { name: "Other" });

      const session = createMockSession(user);
      const caller = expenseRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.submit({
        organizationId: org.id,
        categoryId: category.id,
        amount: 10000,
        date: new Date(),
        description: "No policy",
      });

      expect(result.expense.status).toBe("SUBMITTED");
      expect(result.message).toContain("no policy found");

      const reviews = await db.expenseReview.findMany({
        where: { expenseId: result.expense.id },
      });
      expect(reviews).toHaveLength(1);
      expect(reviews[0]?.status).toBe("SUBMITTED");
      expect(reviews[0]?.comment).toContain("No policy found");
    });

    it("should apply user-specific policy over organization policy", async () => {
      const user = await createTestUser();
      const org = await createTestOrganization(user.id);
      const category = await createTestCategory(org.id);

      await createTestPolicy(org.id, category.id, {
        maxAmount: 50000,
        autoApprove: true,
      });

      await createTestPolicy(org.id, category.id, {
        userId: user.id,
        maxAmount: 100000,
        autoApprove: false,
      });

      const session = createMockSession(user);
      const caller = expenseRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.submit({
        organizationId: org.id,
        categoryId: category.id,
        amount: 75000,
        date: new Date(),
        description: "User-specific policy test",
      });

      expect(result.expense.status).toBe("SUBMITTED");
      expect(result.message).toBe("Expense submitted for review");
    });

    it("should reject if amount is not positive", async () => {
      const user = await createTestUser();
      const org = await createTestOrganization(user.id);
      const category = await createTestCategory(org.id);

      const session = createMockSession(user);
      const caller = expenseRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.submit({
          organizationId: org.id,
          categoryId: category.id,
          amount: -100,
          date: new Date(),
          description: "Negative amount",
        })
      ).rejects.toThrow();
    });

    it("should reject if category doesn't exist", async () => {
      const user = await createTestUser();
      const org = await createTestOrganization(user.id);

      const session = createMockSession(user);
      const caller = expenseRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.submit({
          organizationId: org.id,
          categoryId: "invalid-category-id",
          amount: 10000,
          date: new Date(),
          description: "Invalid category",
        })
      ).rejects.toThrow("Category not found");
    });

    it("should reject if user is not a member of organization", async () => {
      const user = await createTestUser();
      const otherUser = await createTestUser({ email: "other@example.com" });
      const org = await createTestOrganization(user.id);
      const category = await createTestCategory(org.id);

      const session = createMockSession(otherUser);
      const caller = expenseRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.submit({
          organizationId: org.id,
          categoryId: category.id,
          amount: 10000,
          date: new Date(),
          description: "Not a member",
        })
      ).rejects.toThrow("not a member");
    });

    it("should reject if category belongs to different organization", async () => {
      const user = await createTestUser();
      const org1 = await createTestOrganization(user.id);
      const org2 = await createTestOrganization(user.id);
      const category = await createTestCategory(org2.id);

      const session = createMockSession(user);
      const caller = expenseRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.submit({
          organizationId: org1.id,
          categoryId: category.id,
          amount: 10000,
          date: new Date(),
          description: "Wrong org",
        })
      ).rejects.toThrow("Category not found");
    });
  });

  describe("list", () => {
    it("should list all organization expenses when no userId filter", async () => {
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

      const category = await createTestCategory(org.id);

      const expense1 = await createTestExpense(org.id, admin.id, category.id, {
        amount: 10000,
      });
      const expense2 = await createTestExpense(org.id, member.id, category.id, {
        amount: 20000,
      });

      const session = createMockSession(admin);
      const caller = expenseRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.list({ organizationId: org.id });

      expect(result).toHaveLength(2);
      expect(result.map((e) => e.id)).toContain(expense1.id);
      expect(result.map((e) => e.id)).toContain(expense2.id);
    });

    it("should list only user's expenses when userId filter provided", async () => {
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

      const category = await createTestCategory(org.id);

      await createTestExpense(org.id, admin.id, category.id, {
        amount: 10000,
      });
      const memberExpense = await createTestExpense(org.id, member.id, category.id, {
        amount: 20000,
      });

      const session = createMockSession(admin);
      const caller = expenseRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.list({
        organizationId: org.id,
        userId: member.id,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(memberExpense.id);
    });

    it("should reject if user is not a member of organization", async () => {
      const user = await createTestUser();
      const otherUser = await createTestUser({ email: "other@example.com" });
      const org = await createTestOrganization(user.id);

      const session = createMockSession(otherUser);
      const caller = expenseRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.list({ organizationId: org.id })
      ).rejects.toThrow("not a member");
    });

    it("should return expenses ordered by creation date descending", async () => {
      const user = await createTestUser();
      const org = await createTestOrganization(user.id);
      const category = await createTestCategory(org.id);

      const expense1 = await createTestExpense(org.id, user.id, category.id, {
        amount: 10000,
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const expense2 = await createTestExpense(org.id, user.id, category.id, {
        amount: 20000,
      });

      const session = createMockSession(user);
      const caller = expenseRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.list({ organizationId: org.id });

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe(expense2.id);
      expect(result[1]?.id).toBe(expense1.id);
    });
  });

  describe("getById", () => {
    it("should return expense with full details including audit trail", async () => {
      const user = await createTestUser();
      const org = await createTestOrganization(user.id);
      const category = await createTestCategory(org.id);
      const expense = await createTestExpense(org.id, user.id, category.id);

      await db.expenseReview.create({
        data: {
          expenseId: expense.id,
          reviewerId: user.id,
          status: "SUBMITTED",
          comment: "Initial submission",
        },
      });

      const session = createMockSession(user);
      const caller = expenseRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.getById({ id: expense.id });

      expect(result.id).toBe(expense.id);
      expect(result.category).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.reviews).toHaveLength(1);
      expect(result.reviews[0]?.comment).toBe("Initial submission");
    });

    it("should reject if expense not found", async () => {
      const user = await createTestUser();
      await createTestOrganization(user.id);

      const session = createMockSession(user);
      const caller = expenseRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.getById({ id: "invalid-expense-id" })
      ).rejects.toThrow("Expense not found");
    });

    it("should reject if user is not a member of organization", async () => {
      const user = await createTestUser();
      const otherUser = await createTestUser({ email: "other@example.com" });
      const org = await createTestOrganization(user.id);
      const category = await createTestCategory(org.id);
      const expense = await createTestExpense(org.id, user.id, category.id);

      const session = createMockSession(otherUser);
      const caller = expenseRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.getById({ id: expense.id })
      ).rejects.toThrow("not a member");
    });
  });

  describe("listForReview", () => {
    it("should only return SUBMITTED status expenses", async () => {
      const user = await createTestUser();
      const org = await createTestOrganization(user.id);
      const category = await createTestCategory(org.id);

      const submittedExpense = await createTestExpense(
        org.id,
        user.id,
        category.id,
        { amount: 10000 }
      );

      await db.expense.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          categoryId: category.id,
          amount: 20000,
          date: new Date(),
          description: "Approved expense",
          status: "APPROVED",
        },
      });

      await db.expense.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          categoryId: category.id,
          amount: 30000,
          date: new Date(),
          description: "Rejected expense",
          status: "REJECTED",
        },
      });

      const session = createMockSession(user);
      const caller = expenseRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.listForReview({ organizationId: org.id });

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(submittedExpense.id);
      expect(result[0]?.status).toBe("SUBMITTED");
    });

    it("should return expenses ordered by creation date ascending", async () => {
      const user = await createTestUser();
      const org = await createTestOrganization(user.id);
      const category = await createTestCategory(org.id);

      const expense1 = await createTestExpense(org.id, user.id, category.id, {
        amount: 10000,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const expense2 = await createTestExpense(org.id, user.id, category.id, {
        amount: 20000,
      });

      const session = createMockSession(user);
      const caller = expenseRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.listForReview({ organizationId: org.id });

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe(expense1.id);
      expect(result[1]?.id).toBe(expense2.id);
    });

    it("should reject if user is not a member of organization", async () => {
      const user = await createTestUser();
      const otherUser = await createTestUser({ email: "other@example.com" });
      const org = await createTestOrganization(user.id);

      const session = createMockSession(otherUser);
      const caller = expenseRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.listForReview({ organizationId: org.id })
      ).rejects.toThrow("not a member");
    });

    it("should include category and user details", async () => {
      const user = await createTestUser({ name: "Test User" });
      const org = await createTestOrganization(user.id);
      const category = await createTestCategory(org.id, { name: "Travel" });
      await createTestExpense(org.id, user.id, category.id);

      const session = createMockSession(user);
      const caller = expenseRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.listForReview({ organizationId: org.id });

      expect(result).toHaveLength(1);
      expect(result[0]?.category.name).toBe("Travel");
      expect(result[0]?.user.name).toBe("Test User");
    });
  });
});
