import { Container, Title, SimpleGrid, Card, Text, Stack } from "@mantine/core";

export default function DashboardPage() {
  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="xl">Dashboard</Title>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" mb="xl">
        <Card withBorder padding="lg">
          <Text size="sm" fw={500} c="dimmed" mb="xs">
            Total Expenses
          </Text>
          <Text size="xl" fw={700}>0</Text>
          <Text size="sm" c="dimmed">No expenses yet</Text>
        </Card>

        <Card withBorder padding="lg">
          <Text size="sm" fw={500} c="dimmed" mb="xs">
            Pending Reviews
          </Text>
          <Text size="xl" fw={700}>0</Text>
          <Text size="sm" c="dimmed">All caught up</Text>
        </Card>

        <Card withBorder padding="lg">
          <Text size="sm" fw={500} c="dimmed" mb="xs">
            Active Policies
          </Text>
          <Text size="xl" fw={700}>0</Text>
          <Text size="sm" c="dimmed">No policies configured</Text>
        </Card>

        <Card withBorder padding="lg">
          <Text size="sm" fw={500} c="dimmed" mb="xs">
            Categories
          </Text>
          <Text size="xl" fw={700}>0</Text>
          <Text size="sm" c="dimmed">No categories created</Text>
        </Card>
      </SimpleGrid>

      <Card withBorder p="xl" ta="center">
        <Stack align="center" gap="sm">
          <Title order={2}>Welcome to your organization</Title>
          <Text c="dimmed">
            Start by creating categories and policies to manage expenses.
          </Text>
        </Stack>
      </Card>
    </Container>
  );
}
