import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

const policyPeriodEnum = z.enum(["MONTHLY", "YEARLY"]);

const createInput = z.object({
  organizationId: z.string(),
  categoryId: z.string(),
  userId: z.string().optional(),
  maxAmount: z.number().positive(),
  period: policyPeriodEnum,
  autoApprove: z.boolean(),
});

const updateInput = z.object({
  id: z.string(),
  maxAmount: z.number().positive(),
  period: policyPeriodEnum,
  autoApprove: z.boolean(),
});

const deleteInput = z.object({
  id: z.string(),
});

const getByIdInput = z.object({
  id: z.string(),
});

const listInput = z.object({
  organizationId: z.string(),
});

const resolvePolicyInput = z.object({
  organizationId: z.string(),
  userId: z.string(),
  categoryId: z.string(),
});

const debugPolicyInput = z.object({
  organizationId: z.string(),
  userId: z.string(),
  categoryId: z.string(),
});

export const policyRouter = createTRPCRouter({
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

      const policies = await ctx.db.policy.findMany({
        where: {
          organizationId: input.organizationId,
        },
        include: {
          category: true,
          user: true,
        },
        orderBy: [
          { userId: "asc" },
          { categoryId: "asc" },
        ],
      });

      return policies;
    }),

  getById: protectedProcedure
    .input(getByIdInput)
    .query(async ({ ctx, input }) => {
      const policy = await ctx.db.policy.findUnique({
        where: { id: input.id },
        include: {
          category: true,
          user: true,
          organization: true,
        },
      });

      if (!policy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Policy not found",
        });
      }

      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: policy.organizationId,
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

      return policy;
    }),

  create: protectedProcedure
    .input(createInput)
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: input.organizationId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!membership || membership.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can create policies",
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

      if (input.userId) {
        const userMembership = await ctx.db.organizationMembership.findUnique({
          where: {
            organizationId_userId: {
              organizationId: input.organizationId,
              userId: input.userId,
            },
          },
        });

        if (!userMembership) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User is not a member of this organization",
          });
        }
      }

      const policy = await ctx.db.policy.create({
        data: {
          organizationId: input.organizationId,
          categoryId: input.categoryId,
          userId: input.userId,
          maxAmount: input.maxAmount,
          period: input.period,
          autoApprove: input.autoApprove,
        },
        include: {
          category: true,
          user: true,
        },
      });

      return policy;
    }),

  update: protectedProcedure
    .input(updateInput)
    .mutation(async ({ ctx, input }) => {
      const policy = await ctx.db.policy.findUnique({
        where: { id: input.id },
      });

      if (!policy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Policy not found",
        });
      }

      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: policy.organizationId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!membership || membership.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can update policies",
        });
      }

      const updatedPolicy = await ctx.db.policy.update({
        where: { id: input.id },
        data: {
          maxAmount: input.maxAmount,
          period: input.period,
          autoApprove: input.autoApprove,
        },
        include: {
          category: true,
          user: true,
        },
      });

      return updatedPolicy;
    }),

  delete: protectedProcedure
    .input(deleteInput)
    .mutation(async ({ ctx, input }) => {
      const policy = await ctx.db.policy.findUnique({
        where: { id: input.id },
      });

      if (!policy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Policy not found",
        });
      }

      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: policy.organizationId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!membership || membership.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can delete policies",
        });
      }

      const deletedPolicy = await ctx.db.policy.delete({
        where: { id: input.id },
        include: {
          category: true,
          user: true,
        },
      });

      return deletedPolicy;
    }),

  resolvePolicy: protectedProcedure
    .input(resolvePolicyInput)
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

      const userSpecificPolicy = await ctx.db.policy.findFirst({
        where: {
          organizationId: input.organizationId,
          userId: input.userId,
          categoryId: input.categoryId,
        },
        include: {
          category: true,
          user: true,
        },
      });

      if (userSpecificPolicy) {
        return userSpecificPolicy;
      }

      const organizationPolicy = await ctx.db.policy.findFirst({
        where: {
          organizationId: input.organizationId,
          userId: null,
          categoryId: input.categoryId,
        },
        include: {
          category: true,
        },
      });

      if (organizationPolicy) {
        return organizationPolicy;
      }

      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No policy found for this user and category",
      });
    }),

  debugPolicy: protectedProcedure
    .input(debugPolicyInput)
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

      const userSpecificPolicy = await ctx.db.policy.findFirst({
        where: {
          organizationId: input.organizationId,
          userId: input.userId,
          categoryId: input.categoryId,
        },
        include: {
          category: true,
          user: true,
        },
      });

      const organizationPolicy = await ctx.db.policy.findFirst({
        where: {
          organizationId: input.organizationId,
          userId: null,
          categoryId: input.categoryId,
        },
        include: {
          category: true,
        },
      });

      let selectedPolicy = null;
      let reason = "";

      if (userSpecificPolicy) {
        selectedPolicy = userSpecificPolicy;
        reason = "User-specific policy takes precedence over organization-wide policy";
      } else if (organizationPolicy) {
        selectedPolicy = organizationPolicy;
        reason = "No user-specific policy found, using organization-wide policy";
      } else {
        reason = "No policy found for this user and category combination";
      }

      return {
        userSpecificPolicy,
        organizationPolicy,
        selectedPolicy,
        reason,
      };
    }),
});
