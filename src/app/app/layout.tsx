import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, Group, Text, Button, Stack } from "@mantine/core";
import { auth } from "~/server/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Text fw={600} size="lg">
            Expensify Clone
          </Text>
          <Group gap="md">
            <Stack gap={0} align="flex-end">
              <Text size="sm" fw={500}>
                {session.user?.name}
              </Text>
              <Text size="xs" c="dimmed">
                {session.user?.email}
              </Text>
            </Stack>
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
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
