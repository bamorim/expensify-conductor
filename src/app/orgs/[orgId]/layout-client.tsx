"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { AppShell, Group, Text, Button, NavLink, Box } from "@mantine/core";
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
    { href: `/orgs/${orgId}/messages`, label: "Messages" },
    { href: `/orgs/${orgId}/categories`, label: "Categories" },
    { href: `/orgs/${orgId}/policies`, label: "Policies" },
    { href: `/orgs/${orgId}/expenses`, label: "Expenses" },
    { href: `/orgs/${orgId}/reviews`, label: "Reviews" },
    { href: `/orgs/${orgId}/settings`, label: "Settings" },
  ];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 250, breakpoint: "sm" }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Text fw={600} size="lg">
            Expensify Clone
          </Text>
          <Group gap="md">
            <OrgSelector />
            <Button
              component={Link}
              href="/api/auth/signout"
              variant="light"
              color="gray"
              size="sm"
            >
              Sign Out
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Box component="nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <NavLink
                key={item.href}
                component={Link}
                href={item.href}
                label={item.label}
                active={isActive}
                aria-current={isActive ? "page" : undefined}
              />
            );
          })}
        </Box>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
