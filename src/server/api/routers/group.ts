import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const groupRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      organizationId: z.string(),
      name: z.string().min(1),
      description: z.string().optional(),
      parentGroupId: z.string().optional(),
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
          message: "Only admins can create groups",
        });
      }

      // Verify parent group exists and belongs to same organization
      if (input.parentGroupId) {
        const parentGroup = await ctx.db.group.findUnique({
          where: { id: input.parentGroupId },
        });

        if (!parentGroup || parentGroup.organizationId !== input.organizationId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Parent group not found or belongs to different organization",
          });
        }
      }

      const group = await ctx.db.group.create({
        data: {
          name: input.name,
          description: input.description,
          organizationId: input.organizationId,
          parentGroupId: input.parentGroupId,
        },
        include: {
          parentGroup: true,
          childGroups: true,
          members: {
            include: {
              user: true,
            },
          },
        },
      });

      return group;
    }),

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

      const groups = await ctx.db.group.findMany({
        where: {
          organizationId: input.organizationId,
        },
        include: {
          parentGroup: true,
          childGroups: true,
          members: {
            include: {
              user: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      return groups;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const group = await ctx.db.group.findUnique({
        where: { id: input.id },
        include: {
          organization: true,
          parentGroup: true,
          childGroups: {
            include: {
              members: {
                include: {
                  user: true,
                },
              },
            },
          },
          members: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found",
        });
      }

      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: group.organizationId,
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

      return group;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      parentGroupId: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const group = await ctx.db.group.findUnique({
        where: { id: input.id },
      });

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found",
        });
      }

      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: group.organizationId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!membership || membership.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can update groups",
        });
      }

      // Verify new parent group if provided
      if (input.parentGroupId !== undefined && input.parentGroupId !== null) {
        if (input.parentGroupId === input.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A group cannot be its own parent",
          });
        }

        const parentGroup = await ctx.db.group.findUnique({
          where: { id: input.parentGroupId },
        });

        if (!parentGroup || parentGroup.organizationId !== group.organizationId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Parent group not found or belongs to different organization",
          });
        }

        // Check for circular hierarchy
        let currentParent = parentGroup;
        while (currentParent.parentGroupId) {
          if (currentParent.parentGroupId === input.id) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Cannot create circular hierarchy",
            });
          }
          const nextParent = await ctx.db.group.findUnique({
            where: { id: currentParent.parentGroupId },
          });
          if (!nextParent) break;
          currentParent = nextParent;
        }
      }

      const updatedGroup = await ctx.db.group.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
          parentGroupId: input.parentGroupId,
        },
        include: {
          parentGroup: true,
          childGroups: true,
          members: {
            include: {
              user: true,
            },
          },
        },
      });

      return updatedGroup;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const group = await ctx.db.group.findUnique({
        where: { id: input.id },
      });

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found",
        });
      }

      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: group.organizationId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!membership || membership.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can delete groups",
        });
      }

      await ctx.db.group.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  addMember: protectedProcedure
    .input(z.object({
      groupId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const group = await ctx.db.group.findUnique({
        where: { id: input.groupId },
      });

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found",
        });
      }

      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: group.organizationId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!membership || membership.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can add members to groups",
        });
      }

      // Verify user is a member of the organization
      const userMembership = await ctx.db.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: group.organizationId,
            userId: input.userId,
          },
        },
      });

      if (!userMembership) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User is not a member of this organization",
        });
      }

      const groupMembership = await ctx.db.groupMembership.create({
        data: {
          groupId: input.groupId,
          userId: input.userId,
        },
        include: {
          user: true,
          group: true,
        },
      });

      return groupMembership;
    }),

  removeMember: protectedProcedure
    .input(z.object({
      groupId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const group = await ctx.db.group.findUnique({
        where: { id: input.groupId },
      });

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found",
        });
      }

      const membership = await ctx.db.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: group.organizationId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!membership || membership.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can remove members from groups",
        });
      }

      await ctx.db.groupMembership.delete({
        where: {
          groupId_userId: {
            groupId: input.groupId,
            userId: input.userId,
          },
        },
      });

      return { success: true };
    }),

  getHierarchy: protectedProcedure
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

      // Get all groups for the organization
      const allGroups = await ctx.db.group.findMany({
        where: {
          organizationId: input.organizationId,
        },
        include: {
          members: {
            include: {
              user: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      // Build hierarchy - return root groups (no parent) with nested children
      const groupMap = new Map(allGroups.map(g => [g.id, { ...g, children: [] as typeof allGroups }]));
      const rootGroups: (typeof allGroups[0] & { children: typeof allGroups })[] = [];

      for (const group of allGroups) {
        const groupWithChildren = groupMap.get(group.id)!;
        if (group.parentGroupId) {
          const parent = groupMap.get(group.parentGroupId);
          if (parent) {
            parent.children.push(groupWithChildren);
          } else {
            rootGroups.push(groupWithChildren);
          }
        } else {
          rootGroups.push(groupWithChildren);
        }
      }

      return rootGroups;
    }),
});
