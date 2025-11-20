"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Container, Title, Button, Table, Text, Card, Stack, Group, Badge, Skeleton, SegmentedControl } from "@mantine/core";
import { api } from "~/trpc/react";
import { useState } from "react";

type ExpenseStatus = "SUBMITTED" | "APPROVED" | "REJECTED";

function StatusBadge({ status }: { status: ExpenseStatus }) {
  const config = {
    SUBMITTED: { color: "yellow", label: "Awaiting Review" },
    APPROVED: { color: "green", label: "Approved" },
    REJECTED: { color: "red", label: "Rejected" },
  };

  const { color, label } = config[status];

  return (
    <Badge color={color} variant="light">
      {label}
    </Badge>
  );
}

export default function ExpensesPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;

  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const { data: expenses, isLoading } = api.expense.list.useQuery({
    organizationId: orgId,
  });

  const filteredExpenses =
    statusFilter === "ALL"
      ? expenses
      : expenses?.filter((e) => e.status === statusFilter);

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl" wrap="wrap">
        <Title order={1}>Expenses</Title>
        <Button component={Link} href={`/orgs/${orgId}/expenses/new`}>
          Submit Expense
        </Button>
      </Group>

      <SegmentedControl
        value={statusFilter}
        onChange={setStatusFilter}
        data={[
          { label: "All", value: "ALL" },
          { label: "Submitted", value: "SUBMITTED" },
          { label: "Approved", value: "APPROVED" },
          { label: "Rejected", value: "REJECTED" },
        ]}
        mb="lg"
      />

      {isLoading ? (
        <Stack gap="md">
          {[...Array<number>(3)].map((_, i) => (
            <Skeleton key={i} height={80} />
          ))}
        </Stack>
      ) : !filteredExpenses || filteredExpenses.length === 0 ? (
        <Card withBorder p="xl" ta="center">
          <Stack align="center" gap="md">
            <Title order={3}>
              {statusFilter === "ALL"
                ? "No expenses yet"
                : `No ${statusFilter.toLowerCase()} expenses`}
            </Title>
            <Text c="dimmed">
              {statusFilter === "ALL"
                ? "Submit your first expense reimbursement request."
                : `No expenses with status: ${statusFilter.toLowerCase()}`}
            </Text>
            {statusFilter === "ALL" && (
              <Button component={Link} href={`/orgs/${orgId}/expenses/new`}>
                Submit Expense
              </Button>
            )}
          </Stack>
        </Card>
      ) : (
        <Card withBorder p={0}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Category</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Amount</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th ta="right">Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredExpenses.map((expense) => (
                <Table.Tr key={expense.id}>
                  <Table.Td>
                    {new Date(expense.date).toLocaleDateString()}
                  </Table.Td>
                  <Table.Td>{expense.category.name}</Table.Td>
                  <Table.Td maw={200} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {expense.description}
                  </Table.Td>
                  <Table.Td fw={500}>
                    ${(expense.amount / 100).toFixed(2)}
                  </Table.Td>
                  <Table.Td>
                    <StatusBadge status={expense.status} />
                  </Table.Td>
                  <Table.Td ta="right">
                    <Button
                      component={Link}
                      href={`/orgs/${orgId}/expenses/${expense.id}`}
                      variant="subtle"
                      size="xs"
                    >
                      View Details
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}
    </Container>
  );
}
