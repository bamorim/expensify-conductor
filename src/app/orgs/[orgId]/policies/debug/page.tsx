"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Container, Title, Text, Select, Button, Card, Alert, Anchor, SimpleGrid, Badge, Stack, Group } from "@mantine/core";
import { api } from "~/trpc/react";
import { useState } from "react";

export default function PolicyDebugPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;

  const [selectedUserId, setSelectedUserId] = useState<string | null>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>("");

  const { data: categories } = api.category.list.useQuery({
    organizationId: orgId,
  });

  const { data: members } = api.organization.listMembers.useQuery({
    organizationId: orgId,
  });

  const { data: debugResult, refetch } = api.policy.debugPolicy.useQuery(
    {
      organizationId: orgId,
      userId: selectedUserId ?? "",
      categoryId: selectedCategoryId ?? "",
    },
    {
      enabled: false,
    }
  );

  const handleDebug = () => {
    if (selectedUserId && selectedCategoryId) {
      void refetch();
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100);
  };

  return (
    <Container size="md" py="xl">
      <Anchor component={Link} href={`/orgs/${orgId}/policies`} size="sm" mb="md">
        Back to Policies
      </Anchor>
      <Title order={1} mb="xs">Policy Debugger</Title>
      <Text c="dimmed" mb="xl">
        Test which policy applies to a specific user and category combination
      </Text>

      <Card withBorder p="lg" mb="xl">
        <Title order={3} mb="md">Select Parameters</Title>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="md">
          <Select
            label="User"
            placeholder="Select a user"
            value={selectedUserId}
            onChange={setSelectedUserId}
            data={members?.map((member) => ({
              value: member.userId,
              label: member.user.name ?? member.user.email ?? "Unknown",
            })) ?? []}
          />

          <Select
            label="Category"
            placeholder="Select a category"
            value={selectedCategoryId}
            onChange={setSelectedCategoryId}
            data={categories?.map((category) => ({
              value: category.id,
              label: category.name,
            })) ?? []}
          />
        </SimpleGrid>

        <Button
          onClick={handleDebug}
          disabled={!selectedUserId || !selectedCategoryId}
          fullWidth
        >
          Resolve Policy
        </Button>
      </Card>

      {debugResult && (
        <Stack gap="md">
          <Card withBorder p="lg">
            <Title order={3} mb="md">Resolution Result</Title>

            <Alert color="blue" mb="md">
              {debugResult.reason}
            </Alert>

            {debugResult.userSpecificPolicy && (
              <div>
                <Group justify="space-between" mb="sm">
                  <Text fw={500}>User-specific Policy</Text>
                  {debugResult.selectedPolicy?.id === debugResult.userSpecificPolicy.id && (
                    <Badge color="green">Selected</Badge>
                  )}
                </Group>
                <Card withBorder bg={debugResult.selectedPolicy?.id === debugResult.userSpecificPolicy.id ? "green.0" : undefined} p="md" mb="md">
                  <SimpleGrid cols={2} spacing="sm">
                    <div>
                      <Text size="xs" c="dimmed" fw={500}>Category</Text>
                      <Text size="sm">
                        {categories?.find((c) => c.id === debugResult.userSpecificPolicy?.categoryId)?.name ?? "Unknown"}
                      </Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed" fw={500}>Max Amount</Text>
                      <Text size="sm">{formatAmount(debugResult.userSpecificPolicy.maxAmount)}</Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed" fw={500}>Period</Text>
                      <Text size="sm">{debugResult.userSpecificPolicy.period}</Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed" fw={500}>Auto-approve</Text>
                      <Text size="sm">{debugResult.userSpecificPolicy.autoApprove ? "Yes" : "No"}</Text>
                    </div>
                  </SimpleGrid>
                </Card>
              </div>
            )}

            {debugResult.organizationPolicy && (
              <div>
                <Group justify="space-between" mb="sm">
                  <Text fw={500}>Organization Policy</Text>
                  {debugResult.selectedPolicy?.id === debugResult.organizationPolicy.id ? (
                    <Badge color="green">Selected</Badge>
                  ) : debugResult.userSpecificPolicy ? (
                    <Badge color="gray">Overridden</Badge>
                  ) : null}
                </Group>
                <Card withBorder bg={debugResult.selectedPolicy?.id === debugResult.organizationPolicy.id ? "green.0" : undefined} p="md" mb="md">
                  <SimpleGrid cols={2} spacing="sm">
                    <div>
                      <Text size="xs" c="dimmed" fw={500}>Category</Text>
                      <Text size="sm">
                        {categories?.find((c) => c.id === debugResult.organizationPolicy?.categoryId)?.name ?? "Unknown"}
                      </Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed" fw={500}>Max Amount</Text>
                      <Text size="sm">{formatAmount(debugResult.organizationPolicy.maxAmount)}</Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed" fw={500}>Period</Text>
                      <Text size="sm">{debugResult.organizationPolicy.period}</Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed" fw={500}>Auto-approve</Text>
                      <Text size="sm">{debugResult.organizationPolicy.autoApprove ? "Yes" : "No"}</Text>
                    </div>
                  </SimpleGrid>
                </Card>
              </div>
            )}

            {!debugResult.selectedPolicy && (
              <Alert color="yellow" title="No Policy Found">
                No policy applies to this user and category combination.
                Consider creating one in the{" "}
                <Anchor component={Link} href={`/orgs/${orgId}/policies`}>
                  Policies page
                </Anchor>
                .
              </Alert>
            )}
          </Card>
        </Stack>
      )}
    </Container>
  );
}
