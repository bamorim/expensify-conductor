import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

const listInput = z.object({
  organizationId: z.string(),
});

const createInput = z.object({
  organizationId: z.string(),
  content: z.string().min(1).max(1000),
});

export const messageRouter = createTRPCRouter({
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

      const messages = await ctx.db.message.findMany({
        where: {
          organizationId: input.organizationId,
        },
        include: {
          author: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return messages;
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

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this organization",
        });
      }

      const message = await ctx.db.message.create({
        data: {
          organizationId: input.organizationId,
          userId: ctx.session.user.id,
          content: input.content,
        },
        include: {
          author: true,
        },
      });

      return message;
    }),
});
