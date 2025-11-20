"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Container, Title, Text, TextInput, Select, Button, Group, Card, Alert, Anchor, Checkbox, Skeleton, Stack } from "@mantine/core";
import { api } from "~/trpc/react";
import { useState, useEffect } from "react";

export default function EditPolicyPage() {
  const params = useParams<{ orgId: string; id: string }>();
  const router = useRouter();
  const orgId = params.orgId;
  const policyId = params.id;

  const [maxAmount, setMaxAmount] = useState("");
  const [period, setPeriod] = useState<string | null>("MONTHLY");
  const [autoApprove, setAutoApprove] = useState(false);
  const [error, setError] = useState("");

  const { data: policy, isLoading } = api.policy.getById.useQuery({
    id: policyId,
  });

  const { data: category } = api.category.list.useQuery(
    { organizationId: orgId },
    {
      enabled: !!policy,
      select: (categories) =>
        categories.find((c) => c.id === policy?.categoryId),
    }
  );

  const { data: user } = api.organization.listMembers.useQuery(
    { organizationId: orgId },
    {
      enabled: !!policy?.userId,
      select: (members) =>
        members.find((m) => m.userId === policy?.userId)?.user,
    }
  );

  useEffect(() => {
    if (policy) {
      setMaxAmount((policy.maxAmount / 100).toFixed(2));
      setPeriod(policy.period);
      setAutoApprove(policy.autoApprove);
    }
  }, [policy]);

  const updatePolicyMutation = api.policy.update.useMutation({
    onSuccess: () => {
      router.push(`/orgs/${orgId}/policies`);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!maxAmount || parseFloat(maxAmount) <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    const amountInCents = Math.round(parseFloat(maxAmount) * 100);

    updatePolicyMutation.mutate({
      id: policyId,
      maxAmount: amountInCents,
      period: period as "MONTHLY" | "YEARLY",
      autoApprove,
    });
  };

  if (isLoading) {
    return (
      <Container size="sm" py="xl">
        <Skeleton height={400} />
      </Container>
    );
  }

  if (!policy) {
    return (
      <Container size="sm" py="xl">
        <Alert color="red">Policy not found</Alert>
      </Container>
    );
  }

  return (
    <Container size="sm" py="xl">
      <Anchor component={Link} href={`/orgs/${orgId}/policies`} size="sm" mb="md">
        Back to Policies
      </Anchor>
      <Title order={1} mb="xl">Edit Policy</Title>

      <Card withBorder p="lg">
        <form onSubmit={handleSubmit}>
          {error && (
            <Alert color="red" mb="md">
              {error}
            </Alert>
          )}

          <Card withBorder bg="gray.0" p="md" mb="lg">
            <Title order={4} mb="sm">Policy Details (Cannot be changed)</Title>
            <Stack gap="xs">
              <div>
                <Text size="xs" fw={500} c="dimmed">Scope</Text>
                <Text size="sm">
                  {policy.userId
                    ? `User-specific: ${user?.name ?? user?.email ?? "Unknown User"}`
                    : "Organization-wide"}
                </Text>
              </div>
              <div>
                <Text size="xs" fw={500} c="dimmed">Category</Text>
                <Text size="sm">{category?.name ?? "Unknown"}</Text>
              </div>
            </Stack>
            <Text size="xs" c="dimmed" mt="sm">
              To change the scope or category, please create a new policy
            </Text>
          </Card>

          <TextInput
            label="Maximum Amount (USD)"
            placeholder="0.00"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.currentTarget.value)}
            leftSection="$"
            type="number"
            min={0.01}
            step={0.01}
            required
            description="Maximum amount allowed per period"
            mb="md"
          />

          <Select
            label="Period"
            value={period}
            onChange={setPeriod}
            data={[
              { label: "Monthly", value: "MONTHLY" },
              { label: "Yearly", value: "YEARLY" },
            ]}
            required
            description="Time period for the spending limit"
            mb="md"
          />

          <Checkbox
            label="Auto-approve compliant expenses"
            description={
              autoApprove
                ? "Expenses within this policy's limits will be automatically approved"
                : "Expenses within this policy's limits will require manual review"
            }
            checked={autoApprove}
            onChange={(e) => setAutoApprove(e.currentTarget.checked)}
            mb="lg"
          />

          <Group justify="flex-end">
            <Button
              component={Link}
              href={`/orgs/${orgId}/policies`}
              variant="outline"
            >
              Cancel
            </Button>
            <Button type="submit" loading={updatePolicyMutation.isPending}>
              {updatePolicyMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </Group>
        </form>
      </Card>
    </Container>
  );
}
