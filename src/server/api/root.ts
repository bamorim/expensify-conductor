import { organizationRouter } from "~/server/api/routers/organization";
import { categoryRouter } from "~/server/api/routers/category";
import { policyRouter } from "~/server/api/routers/policy";
import { reviewRouter } from "~/server/api/routers/review";
import { expenseRouter } from "~/server/api/routers/expense";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  organization: organizationRouter,
  category: categoryRouter,
  policy: policyRouter,
  review: reviewRouter,
  expense: expenseRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
