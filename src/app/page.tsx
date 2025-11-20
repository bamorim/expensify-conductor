import Link from "next/link";
import { Container, Title, Text, Button, Stack, Center } from "@mantine/core";

import { auth } from "~/server/auth";

export default async function Home() {
  const session = await auth();

  return (
    <Container size="sm" py={120}>
      <Center>
        <Stack align="center" gap="xl" ta="center">
          <div>
            <Title order={1} mb="md">
              Expensify Clone
            </Title>
            <Text size="lg" c="dimmed" maw={500}>
              Submit expenses in seconds, get approved in minutes. Smart policy
              checks catch errors before they slow you down.
            </Text>
          </div>

          <Stack align="center" gap="sm">
            <Button
              component={Link}
              href={session ? "/app/organizations" : "/api/auth/signin"}
              size="md"
            >
              {session ? "Go To App" : "Sign In"}
            </Button>
            {session && (
              <Text size="sm" c="dimmed">
                Signed in as {session.user?.name}
              </Text>
            )}
          </Stack>
        </Stack>
      </Center>
    </Container>
  );
}
