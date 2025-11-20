"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Container, Title, Text, Card, Group, Badge, Skeleton, Stack, Anchor, SimpleGrid, Timeline } from "@mantine/core";
import { api } from "~/trpc/react";

type ExpenseStatus = "SUBMITTED" | "APPROVED" | "REJECTED";

function StatusBadge({ status }: { status: ExpenseStatus }) {
  const config = {
    SUBMITTED: { color: "yellow", label: "Awaiting Review" },
    APPROVED: { color: "green", label: "Approved" },
    REJECTED: { color: "red", label: "Rejected" },
  };

  const { color, label } = config[status];

  return (
    <Badge color={color} variant="light" size="lg">
      {label}
    </Badge>
  );
}

export default function ExpenseDetailPage() {
  const params = useParams<{ orgId: string; id: string }>();
  const { orgId, id } = params;

  const { data: expense, isLoading, error } = api.expense.getById.useQuery({
    id,
  });

  if (isLoading) {
    return (
      <Container size="md" py="xl">
        <Skeleton height={24} width={150} mb="md" />
        <Skeleton height={400} />
      </Container>
    );
  }

  if (error || !expense) {
    return (
      <Container size="md" py="xl">
        <Card withBorder p="lg" ta="center" bg="red.0">
          <Title order={2} c="red.9" mb="xs">
            Expense Not Found
          </Title>
          <Text c="red.7" mb="md">
            {error?.message ?? "The expense you're looking for doesn't exist."}
          </Text>
          <Anchor component={Link} href={`/orgs/${orgId}/expenses`}>
            Back to Expenses
          </Anchor>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Anchor component={Link} href={`/orgs/${orgId}/expenses`} size="sm" mb="md">
        Back to Expenses
      </Anchor>

      <Group justify="space-between" align="flex-start" mb="xl">
        <div>
          <Title order={1}>Expense Details</Title>
          <Text size="sm" c="dimmed">
            Submitted on {new Date(expense.createdAt).toLocaleDateString()}
          </Text>
        </div>
        <StatusBadge status={expense.status} />
      </Group>

      <Stack gap="lg">
        <Card withBorder p="lg">
          <Title order={3} mb="md">Expense Information</Title>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <div>
              <Text size="sm" c="dimmed" fw={500}>Category</Text>
              <Text>{expense.category.name}</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed" fw={500}>Amount</Text>
              <Text size="lg" fw={600}>${(expense.amount / 100).toFixed(2)}</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed" fw={500}>Expense Date</Text>
              <Text>{new Date(expense.date).toLocaleDateString()}</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed" fw={500}>Submitted By</Text>
              <Text>{expense.user.name ?? expense.user.email}</Text>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <Text size="sm" c="dimmed" fw={500}>Description</Text>
              <Text>{expense.description}</Text>
            </div>
          </SimpleGrid>
        </Card>

        {expense.reviews && expense.reviews.length > 0 && (
          <Card withBorder p="lg">
            <Title order={3} mb="md">Audit Trail</Title>
            <Timeline active={expense.reviews.length - 1} bulletSize={24}>
              {expense.reviews.map((review) => (
                <Timeline.Item
                  key={review.id}
                  color={
                    review.status === "APPROVED"
                      ? "green"
                      : review.status === "REJECTED"
                        ? "red"
                        : "yellow"
                  }
                  title={
                    review.status === "SUBMITTED"
                      ? "Submitted"
                      : review.status === "APPROVED"
                        ? "Approved"
                        : "Rejected"
                  }
                >
                  <Text size="xs" c="dimmed">
                    {new Date(review.createdAt).toLocaleString()}
                  </Text>
                  {review.reviewer && (
                    <Text size="sm" c="dimmed">
                      by {review.reviewer.name ?? review.reviewer.email}
                    </Text>
                  )}
                  {review.comment && (
                    <Text size="sm" mt="xs">
                      {review.comment}
                    </Text>
                  )}
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
