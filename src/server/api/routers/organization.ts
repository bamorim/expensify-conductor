import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const organizationRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const organization = await ctx.db.organization.create({
        data: {
          name: input.name,
          memberships: {
            create: {
              userId: ctx.session.user.id,
              role: "ADMIN",
            },
          },
        },
        include: {
          memberships: {
            include: {
              user: true,
            },
          },
        },
      });

      return organization;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const organizations = await ctx.db.organization.findMany({
      where: {
        memberships: {
          some: {
            userId: ctx.session.user.id,
          },
        },
      },
      include: {
        memberships: {
          where: {
            userId: ctx.session.user.id,
          },
        },
      },
    });

    return organizations;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: input.id,
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

      const organization = await ctx.db.organization.findUnique({
        where: { id: input.id },
        include: {
          memberships: {
            include: {
              user: true,
            },
          },
        },
      });

      return {
        ...organization!,
        currentUserRole: membership.role,
      };
    }),

  getCurrentMembership: protectedProcedure
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

      return membership;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: input.id,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!membership || membership.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can update organization details",
        });
      }

      const organization = await ctx.db.organization.update({
        where: { id: input.id },
        data: { name: input.name },
      });

      return organization;
    }),

  inviteUser: protectedProcedure
    .input(z.object({ 
      organizationId: z.string(),
      email: z.string().email(),
      role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
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
          message: "Only admins can invite users",
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found with this email",
        });
      }

      const existingMembership = await ctx.db.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: input.organizationId,
            userId: user.id,
          },
        },
      });

      if (existingMembership) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User is already a member of this organization",
        });
      }

      const newMembership = await ctx.db.organizationMembership.create({
        data: {
          organizationId: input.organizationId,
          userId: user.id,
          role: input.role,
        },
        include: {
          user: true,
          organization: true,
        },
      });

      return newMembership;
    }),

  listMembers: protectedProcedure
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

      const members = await ctx.db.organizationMembership.findMany({
        where: {
          organizationId: input.organizationId,
        },
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      return members;
    }),

  removeMember: protectedProcedure
    .input(z.object({
      organizationId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const adminMembership = await ctx.db.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: input.organizationId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!adminMembership || adminMembership.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can remove members",
        });
      }

      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot remove yourself from the organization",
        });
      }

      await ctx.db.organizationMembership.delete({
        where: {
          organizationId_userId: {
            organizationId: input.organizationId,
            userId: input.userId,
          },
        },
      });

      return { success: true };
    }),

  updateMemberRole: protectedProcedure
    .input(z.object({
      organizationId: z.string(),
      userId: z.string(),
      role: z.enum(["ADMIN", "MEMBER"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const adminMembership = await ctx.db.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: input.organizationId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!adminMembership || adminMembership.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can update member roles",
        });
      }

      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot change your own role",
        });
      }

      const updatedMembership = await ctx.db.organizationMembership.update({
        where: {
          organizationId_userId: {
            organizationId: input.organizationId,
            userId: input.userId,
          },
        },
        data: {
          role: input.role,
        },
        include: {
          user: true,
        },
      });

      return updatedMembership;
    }),
});
