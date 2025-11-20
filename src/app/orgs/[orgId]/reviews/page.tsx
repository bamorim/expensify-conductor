import { Container, Title, Card, Stack, Text } from "@mantine/core";

export default function ReviewsPage() {
  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="xl">Reviews</Title>

      <Card withBorder p="xl" ta="center">
        <Stack align="center" gap="md">
          <Title order={3}>No pending reviews</Title>
          <Text c="dimmed">
            Review and approve or reject expense reimbursement requests.
          </Text>
          <Text size="sm" c="dimmed">
            Review workflow coming soon.
          </Text>
        </Stack>
      </Card>
    </Container>
  );
}
