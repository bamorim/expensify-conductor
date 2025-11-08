import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const categoryRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
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

      const categories = await ctx.db.expenseCategory.findMany({
        where: {
          organizationId: input.organizationId,
        },
        orderBy: {
          name: "asc",
        },
      });

      return categories;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const category = await ctx.db.expenseCategory.findUnique({
        where: { id: input.id },
        include: {
          organization: true,
        },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }

      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: category.organizationId,
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

      return category;
    }),

  create: protectedProcedure
    .input(z.object({
      organizationId: z.string(),
      name: z.string().min(1),
      description: z.string().optional(),
    }))
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
          message: "Only admins can create categories",
        });
      }

      const existing = await ctx.db.expenseCategory.findFirst({
        where: {
          organizationId: input.organizationId,
          name: input.name,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Category name already exists in this organization",
        });
      }

      const category = await ctx.db.expenseCategory.create({
        data: {
          organizationId: input.organizationId,
          name: input.name,
          description: input.description,
        },
      });

      return category;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const category = await ctx.db.expenseCategory.findUnique({
        where: { id: input.id },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }

      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: category.organizationId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!membership || membership.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can update categories",
        });
      }

      const existing = await ctx.db.expenseCategory.findFirst({
        where: {
          organizationId: category.organizationId,
          name: input.name,
          id: { not: input.id },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Category name already exists in this organization",
        });
      }

      const updatedCategory = await ctx.db.expenseCategory.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
        },
      });

      return updatedCategory;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const category = await ctx.db.expenseCategory.findUnique({
        where: { id: input.id },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }

      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: category.organizationId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!membership || membership.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can delete categories",
        });
      }

      await ctx.db.expenseCategory.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
