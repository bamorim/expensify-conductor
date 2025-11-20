"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Container, Title, Button, Table, Text, Card, Stack, Group, Badge, Skeleton, SegmentedControl, Select, Modal } from "@mantine/core";
import { api } from "~/trpc/react";
import { useState } from "react";

export default function PoliciesPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;

  const { data: policies, isLoading } = api.policy.list.useQuery({
    organizationId: orgId,
  });

  const { data: categories } = api.category.list.useQuery({
    organizationId: orgId,
  });

  const { data: members } = api.organization.listMembers.useQuery({
    organizationId: orgId,
  });

  const { data: organization } = api.organization.getById.useQuery(
    { id: orgId },
    { enabled: !!orgId }
  );

  const currentMembership = organization?.currentUserMembership;

  const deletePolicyMutation = api.policy.delete.useMutation({
    onSuccess: () => {
      void utils.policy.list.invalidate();
      setDeleteConfirm(null);
    },
  });

  const utils = api.useUtils();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterScope, setFilterScope] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string | null>("category");

  const isAdmin = currentMembership?.role === "ADMIN";

  const filteredPolicies = policies?.filter((policy) => {
    if (filterScope === "org") return !policy.userId;
    if (filterScope === "user") return !!policy.userId;
    return true;
  });

  const sortedPolicies = filteredPolicies?.sort((a, b) => {
    if (sortBy === "category") {
      const catA = categories?.find((c) => c.id === a.categoryId)?.name ?? "";
      const catB = categories?.find((c) => c.id === b.categoryId)?.name ?? "";
      return catA.localeCompare(catB);
    }
    return b.maxAmount - a.maxAmount;
  });

  const handleDelete = (policyId: string) => {
    deletePolicyMutation.mutate({ id: policyId });
  };

  const getCategoryName = (categoryId: string) => {
    return categories?.find((c) => c.id === categoryId)?.name ?? "Unknown";
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return "Organization-wide";
    const member = members?.find((m) => m.userId === userId);
    return member?.user.name ?? member?.user.email ?? "Unknown User";
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100);
  };

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <Group justify="space-between" mb="xl">
          <Title order={1}>Policies</Title>
        </Group>
        <Skeleton height={400} />
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl" wrap="wrap">
        <Title order={1}>Policies</Title>
        <Group gap="sm">
          <Button
            component={Link}
            href={`/orgs/${orgId}/policies/debug`}
            variant="outline"
          >
            Debug Policies
          </Button>
          {isAdmin && (
            <Button component={Link} href={`/orgs/${orgId}/policies/new`}>
              Create Policy
            </Button>
          )}
        </Group>
      </Group>

      {sortedPolicies && sortedPolicies.length > 0 ? (
        <>
          <Group justify="space-between" mb="md" wrap="wrap">
            <SegmentedControl
              value={filterScope}
              onChange={setFilterScope}
              data={[
                { label: "All", value: "all" },
                { label: "Organization", value: "org" },
                { label: "User-specific", value: "user" },
              ]}
            />
            <Select
              label="Sort by"
              value={sortBy}
              onChange={setSortBy}
              data={[
                { label: "Category", value: "category" },
                { label: "Amount", value: "amount" },
              ]}
              w={150}
            />
          </Group>

          <Card withBorder p={0}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Scope</Table.Th>
                  <Table.Th>Category</Table.Th>
                  <Table.Th>Max Amount</Table.Th>
                  <Table.Th>Period</Table.Th>
                  <Table.Th>Auto-approve</Table.Th>
                  {isAdmin && <Table.Th ta="right">Actions</Table.Th>}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sortedPolicies.map((policy) => (
                  <Table.Tr key={policy.id}>
                    <Table.Td>{getUserName(policy.userId)}</Table.Td>
                    <Table.Td>{getCategoryName(policy.categoryId)}</Table.Td>
                    <Table.Td>{formatAmount(policy.maxAmount)}</Table.Td>
                    <Table.Td>{policy.period}</Table.Td>
                    <Table.Td>
                      <Badge color={policy.autoApprove ? "green" : "yellow"} variant="light">
                        {policy.autoApprove ? "Yes" : "No"}
                      </Badge>
                    </Table.Td>
                    {isAdmin && (
                      <Table.Td ta="right">
                        <Group gap="xs" justify="flex-end">
                          <Button
                            variant="subtle"
                            size="xs"
                            component={Link}
                            href={`/orgs/${orgId}/policies/${policy.id}`}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="subtle"
                            color="red"
                            size="xs"
                            onClick={() => setDeleteConfirm(policy.id)}
                          >
                            Delete
                          </Button>
                        </Group>
                      </Table.Td>
                    )}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </>
      ) : (
        <Card withBorder p="xl" ta="center">
          <Stack align="center" gap="md">
            <Title order={3}>No policies yet</Title>
            <Text c="dimmed">
              Policies define spending limits and approval rules for expense categories.
            </Text>
            {isAdmin && (
              <Button component={Link} href={`/orgs/${orgId}/policies/new`}>
                Create Your First Policy
              </Button>
            )}
          </Stack>
        </Card>
      )}

      <Modal
        opened={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Policy"
        centered
      >
        <Text mb="md">
          Are you sure you want to delete this policy? This action cannot be undone.
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button
            variant="outline"
            onClick={() => setDeleteConfirm(null)}
            disabled={deletePolicyMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            color="red"
            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            loading={deletePolicyMutation.isPending}
          >
            Delete
          </Button>
        </Group>
      </Modal>
    </Container>
  );
}
