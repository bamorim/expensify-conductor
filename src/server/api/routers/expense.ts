import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import type { PrismaClient } from "@prisma/client";

const submitInput = z.object({
  organizationId: z.string(),
  categoryId: z.string(),
  amount: z.number().positive(),
  date: z.date(),
  description: z.string().min(1),
});

const listInput = z.object({
  organizationId: z.string(),
  userId: z.string().optional(),
});

const getByIdInput = z.object({
  id: z.string(),
});

const listForReviewInput = z.object({
  organizationId: z.string(),
});

async function createAuditEntry(
  db: PrismaClient,
  expenseId: string,
  reviewerId: string,
  status: "SUBMITTED" | "APPROVED" | "REJECTED",
  comment?: string,
) {
  return db.expenseReview.create({
    data: {
      expenseId,
      reviewerId,
      status,
      comment,
    },
  });
}

export const expenseRouter = createTRPCRouter({
  submit: protectedProcedure
    .input(submitInput)
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: input.organizationId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this organization",
        });
      }

      const category = await ctx.db.expenseCategory.findUnique({
        where: { id: input.categoryId },
      });

      if (!category || category.organizationId !== input.organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found in this organization",
        });
      }

      const userSpecificPolicy = await ctx.db.policy.findFirst({
        where: {
          organizationId: input.organizationId,
          userId: ctx.session.user.id,
          categoryId: input.categoryId,
        },
      });

      const organizationPolicy = await ctx.db.policy.findFirst({
        where: {
          organizationId: input.organizationId,
          userId: null,
          categoryId: input.categoryId,
        },
      });

      const applicablePolicy = userSpecificPolicy ?? organizationPolicy;

      if (!applicablePolicy) {
        const expense = await ctx.db.expense.create({
          data: {
            organizationId: input.organizationId,
            userId: ctx.session.user.id,
            categoryId: input.categoryId,
            amount: input.amount,
            date: input.date,
            description: input.description,
            status: "SUBMITTED",
          },
          include: {
            category: true,
            user: true,
          },
        });

        await createAuditEntry(
          ctx.db,
          expense.id,
          ctx.session.user.id,
          "SUBMITTED",
          "No policy found - defaulting to manual review",
        );

        return {
          expense,
          message: "Expense submitted for review (no policy found)",
        };
      }

      if (input.amount > applicablePolicy.maxAmount) {
        const expense = await ctx.db.expense.create({
          data: {
            organizationId: input.organizationId,
            userId: ctx.session.user.id,
            categoryId: input.categoryId,
            amount: input.amount,
            date: input.date,
            description: input.description,
            status: "REJECTED",
          },
          include: {
            category: true,
            user: true,
          },
        });

        await createAuditEntry(
          ctx.db,
          expense.id,
          ctx.session.user.id,
          "REJECTED",
          `Amount exceeds policy limit of ${applicablePolicy.maxAmount}`,
        );

        return {
          expense,
          message: `Expense auto-rejected: amount exceeds limit of ${applicablePolicy.maxAmount}`,
        };
      }

      if (applicablePolicy.autoApprove) {
        const expense = await ctx.db.expense.create({
          data: {
            organizationId: input.organizationId,
            userId: ctx.session.user.id,
            categoryId: input.categoryId,
            amount: input.amount,
            date: input.date,
            description: input.description,
            status: "APPROVED",
          },
          include: {
            category: true,
            user: true,
          },
        });

        await createAuditEntry(
          ctx.db,
          expense.id,
          ctx.session.user.id,
          "APPROVED",
          "Auto-approved by policy",
        );

        return {
          expense,
          message: "Expense auto-approved",
        };
      }

      const expense = await ctx.db.expense.create({
        data: {
          organizationId: input.organizationId,
          userId: ctx.session.user.id,
          categoryId: input.categoryId,
          amount: input.amount,
          date: input.date,
          description: input.description,
          status: "SUBMITTED",
        },
        include: {
          category: true,
          user: true,
        },
      });

      await createAuditEntry(
        ctx.db,
        expense.id,
        ctx.session.user.id,
        "SUBMITTED",
        "Awaiting manual review",
      );

      return {
        expense,
        message: "Expense submitted for review",
      };
    }),

  list: protectedProcedure
    .input(listInput)
    .query(async ({ ctx, input }) => {
      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: input.organizationId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this organization",
        });
      }

      const expenses = await ctx.db.expense.findMany({
        where: {
          organizationId: input.organizationId,
          ...(input.userId ? { userId: input.userId } : {}),
        },
        include: {
          category: true,
          user: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return expenses;
    }),

  getById: protectedProcedure
    .input(getByIdInput)
    .query(async ({ ctx, input }) => {
      const expense = await ctx.db.expense.findUnique({
        where: { id: input.id },
        include: {
          category: true,
          user: true,
          reviews: {
            include: {
              reviewer: true,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

      if (!expense) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense not found",
        });
      }

      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: expense.organizationId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this organization",
        });
      }

      return expense;
    }),

  listForReview: protectedProcedure
    .input(listForReviewInput)
    .query(async ({ ctx, input }) => {
      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: input.organizationId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this organization",
        });
      }

      const expenses = await ctx.db.expense.findMany({
        where: {
          organizationId: input.organizationId,
          status: "SUBMITTED",
        },
        include: {
          category: true,
          user: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      return expenses;
    }),
});
