"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { OrgSelector } from "~/app/_components/org-selector";

export default function OrgLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const orgId = params.orgId as string;

  const navItems = [
    { href: `/orgs/${orgId}/dashboard`, label: "Dashboard" },
    { href: `/orgs/${orgId}/groups`, label: "Groups" },
    { href: `/orgs/${orgId}/categories`, label: "Categories" },
    { href: `/orgs/${orgId}/policies`, label: "Policies" },
    { href: `/orgs/${orgId}/expenses`, label: "Expenses" },
    { href: `/orgs/${orgId}/reviews`, label: "Reviews" },
    { href: `/orgs/${orgId}/settings`, label: "Settings" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">
              Expensify Clone
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <OrgSelector />
            <Link
              href="/api/auth/signout"
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
            >
              Sign Out
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-64 border-r border-gray-200 bg-white">
          <nav className="flex flex-col gap-1 p-4" aria-label="Main navigation">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
