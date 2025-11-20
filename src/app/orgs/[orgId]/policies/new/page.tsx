"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Container, Title, TextInput, Select, Button, Group, Card, Alert, Anchor, Checkbox, Radio, Stack } from "@mantine/core";
import { api } from "~/trpc/react";
import { useState } from "react";

export default function NewPolicyPage() {
  const params = useParams<{ orgId: string }>();
  const router = useRouter();
  const orgId = params.orgId;

  const [scope, setScope] = useState<string>("org");
  const [userId, setUserId] = useState<string | null>("");
  const [categoryId, setCategoryId] = useState<string | null>("");
  const [maxAmount, setMaxAmount] = useState("");
  const [period, setPeriod] = useState<string | null>("MONTHLY");
  const [autoApprove, setAutoApprove] = useState(false);
  const [error, setError] = useState("");

  const { data: categories } = api.category.list.useQuery({
    organizationId: orgId,
  });

  const { data: members } = api.organization.listMembers.useQuery({
    organizationId: orgId,
  });

  const utils = api.useUtils();

  const createPolicyMutation = api.policy.create.useMutation({
    onSuccess: () => {
      void utils.policy.list.invalidate();
      router.push(`/orgs/${orgId}/policies`);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!categoryId) {
      setError("Please select a category");
      return;
    }

    if (!maxAmount || parseFloat(maxAmount) <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    if (scope === "user" && !userId) {
      setError("Please select a user for user-specific policy");
      return;
    }

    const amountInCents = Math.round(parseFloat(maxAmount) * 100);

    createPolicyMutation.mutate({
      organizationId: orgId,
      categoryId,
      userId: scope === "user" ? userId! : undefined,
      maxAmount: amountInCents,
      period: period as "MONTHLY" | "YEARLY",
      autoApprove,
    });
  };

  return (
    <Container size="sm" py="xl">
      <Anchor component={Link} href={`/orgs/${orgId}/policies`} size="sm" mb="md">
        Back to Policies
      </Anchor>
      <Title order={1} mb="xl">Create Policy</Title>

      <Card withBorder p="lg">
        <form onSubmit={handleSubmit}>
          {error && (
            <Alert color="red" mb="md">
              {error}
            </Alert>
          )}

          <Radio.Group
            label="Policy Scope"
            value={scope}
            onChange={setScope}
            mb="md"
          >
            <Stack gap="xs" mt="xs">
              <Radio
                value="org"
                label="Organization-wide policy (applies to all users)"
              />
              <Radio
                value="user"
                label="User-specific policy (overrides organization policy)"
              />
            </Stack>
          </Radio.Group>

          {scope === "user" && (
            <Select
              label="User"
              placeholder="Select a user"
              value={userId}
              onChange={setUserId}
              data={members?.map((member) => ({
                value: member.userId,
                label: member.user.name ?? member.user.email ?? "Unknown",
              })) ?? []}
              required
              description="This policy will only apply to the selected user"
              mb="md"
            />
          )}

          <Select
            label="Category"
            placeholder="Select a category"
            value={categoryId}
            onChange={setCategoryId}
            data={categories?.map((category) => ({
              value: category.id,
              label: category.name,
            })) ?? []}
            required
            mb="md"
          />

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
            <Button type="submit" loading={createPolicyMutation.isPending}>
              {createPolicyMutation.isPending ? "Creating..." : "Create Policy"}
            </Button>
          </Group>
        </form>
      </Card>
    </Container>
  );
}
