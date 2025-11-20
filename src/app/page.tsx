import Link from "next/link";
import { Container, Title, Text, Button, Stack, Center, Box } from "@mantine/core";

import { auth } from "~/server/auth";

export default async function Home() {
  const session = await auth();

  return (
    <Box
      component="main"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom, var(--mantine-color-indigo-9), var(--mantine-color-indigo-8), var(--mantine-color-dark-8))",
      }}
    >
      <Container size="md" py="xl">
        <Center style={{ minHeight: "80vh" }}>
          <Stack align="center" gap="xl">
            <Stack align="center" gap="md" ta="center">
              <Title order={1} c="white" fz={{ base: "2.5rem", sm: "3rem", lg: "3.75rem" }} fw={700}>
                Stop Chasing Receipts
                <Text span display="block" c="indigo.3">
                  Start Getting Reimbursed
                </Text>
              </Title>
              <Text size="lg" c="indigo.1" maw={600}>
                Submit expenses in seconds, get approved in minutes. Smart policy checks
                catch errors before they slow you down.
              </Text>
            </Stack>

            <Stack align="center" gap="sm">
              <Button
                component={Link}
                href={session ? "/app/organizations" : "/api/auth/signin"}
                size="lg"
                radius="md"
                color="white"
                c="indigo.9"
              >
                {session ? "Go To App" : "Sign In"}
              </Button>
              {session && (
                <Text size="sm" c="indigo.2">
                  Signed in as {session.user?.name}
                </Text>
              )}
            </Stack>
          </Stack>
        </Center>
      </Container>
    </Box>
  );
}
