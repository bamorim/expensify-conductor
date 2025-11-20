"use client";

import Link from "next/link";
import { Container, Title, Button, Text, Group, Card, SimpleGrid, Center, Stack, Loader, Badge } from "@mantine/core";
import { api } from "~/trpc/react";

export default function OrganizationsPage() {
  const { data: organizations, isLoading } = api.organization.list.useQuery();

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <Center py="xl">
          <Loader />
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Your Organizations</Title>
        <Button component={Link} href="/app/organizations/new">
          Create New Organization
        </Button>
      </Group>

      {!organizations || organizations.length === 0 ? (
        <Card withBorder p="xl" ta="center">
          <Stack align="center" gap="md">
            <Title order={3}>No organizations yet</Title>
            <Text c="dimmed">
              Get started by creating your first organization.
            </Text>
            <Button component={Link} href="/app/organizations/new">
              Create Organization
            </Button>
          </Stack>
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {organizations.map((org) => (
            <Card
              key={org.id}
              component={Link}
              href={`/orgs/${org.id}/dashboard`}
              withBorder
              padding="lg"
              style={{ cursor: "pointer" }}
            >
              <Title order={3} mb="xs">
                {org.name}
              </Title>
              <Group gap="xs">
                <Badge variant="light" size="sm">
                  {org.memberships[0]?.role === "ADMIN" ? "Admin" : "Member"}
                </Badge>
                <Text size="sm" c="dimmed">
                  {org.memberships.length} member(s)
                </Text>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Container>
  );
}
