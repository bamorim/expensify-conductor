import { PrismaAdapter } from "@auth/prisma-adapter";
import { Prisma } from "@prisma/client";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import { env } from "~/env";

import { db } from "~/server/db";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
const prismaAdapter = PrismaAdapter(db);

const adapter = {
  ...prismaAdapter,
  async deleteSession(sessionToken: string) {
    if (!prismaAdapter.deleteSession) return null;

    try {
      return await prismaAdapter.deleteSession(sessionToken);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        return null;
      }
      throw error;
    }
  },
};

export const authConfig = {
  providers: [
    Nodemailer({
      server: env.MAIL_SERVER,
      from: env.MAIL_FROM,
    }),
  ],
  secret: env.AUTH_SECRET,
  adapter,
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
        name: user.name ?? user.email,
      },
    }),
  },
} satisfies NextAuthConfig;
