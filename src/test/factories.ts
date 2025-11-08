import type { Session } from "next-auth";
import type { User } from "@prisma/client";
import { db } from "~/server/db";

export function createMockSession(user: User): Session {
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    },
    expires: "2030-12-31T23:59:59.999Z",
  };
}

export async function createTestUser(data?: {
  name?: string;
  email?: string;
}): Promise<User> {
  return db.user.create({
    data: {
      name: data?.name ?? "Test User",
      email: data?.email ?? `test-${Date.now()}-${Math.random()}@example.com`,
    },
  });
}

export async function createTestOrganization(
  creatorUserId: string,
  data?: { name?: string },
) {
  const org = await db.organization.create({
    data: {
      name: data?.name ?? "Test Organization",
      memberships: {
        create: {
          userId: creatorUserId,
          role: "ADMIN",
        },
      },
    },
    include: {
      memberships: true,
    },
  });

  return org;
}

export async function createTestCategory(
  organizationId: string,
  data?: { name?: string; description?: string },
) {
  return db.expenseCategory.create({
    data: {
      organizationId,
      name: data?.name ?? "Test Category",
      description: data?.description,
    },
  });
}

export async function createTestExpense(
  organizationId: string,
  userId: string,
  categoryId: string,
  data?: {
    amount?: number;
    description?: string;
    date?: Date;
  },
) {
  return db.expense.create({
    data: {
      organizationId,
      userId,
      categoryId,
      amount: data?.amount ?? 10000,
      description: data?.description ?? "Test expense",
      date: data?.date ?? new Date(),
    },
  });
}

export async function createTestPolicy(
  organizationId: string,
  categoryId: string,
  data?: {
    userId?: string;
    maxAmount?: number;
    period?: "MONTHLY" | "YEARLY";
    autoApprove?: boolean;
  },
) {
  return db.policy.create({
    data: {
      organizationId,
      categoryId,
      userId: data?.userId,
      maxAmount: data?.maxAmount ?? 100000,
      period: data?.period ?? "MONTHLY",
      autoApprove: data?.autoApprove ?? false,
    },
  });
}
