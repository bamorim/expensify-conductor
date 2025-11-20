import Link from "next/link";

import { auth } from "~/server/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-indigo-900 via-indigo-800 to-slate-900">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <section className="flex flex-col items-center gap-6 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
            Stop Chasing Receipts
            <span className="block text-indigo-300">Start Getting Reimbursed</span>
          </h1>
          <p className="max-w-2xl text-lg text-indigo-100 sm:text-xl">
            Submit expenses in seconds, get approved in minutes. Smart policy checks
            catch errors before they slow you down.
          </p>
        </section>

        <div className="flex flex-col items-center gap-4">
          <Link
            href={session ? "/app/organizations" : "/api/auth/signin"}
            className="rounded-lg bg-white px-8 py-3 text-lg font-semibold text-indigo-900 shadow-lg transition hover:bg-indigo-50 hover:shadow-xl"
          >
            {session ? "Go To App" : "Sign In"}
          </Link>
          {session && (
            <p className="text-sm text-indigo-200">
              Signed in as {session.user?.name}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
