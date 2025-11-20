"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Container, Title, Text, TextInput, Textarea, Select, Button, Group, Card, Alert, Skeleton } from "@mantine/core";
import { api } from "~/trpc/react";

export default function NewGroupPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentGroupId, setParentGroupId] = useState<string | null>("");
  const [nameError, setNameError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");

  const { data, isLoading: membershipLoading } = api.organization.getById.useQuery({
    id: orgId,
  });

  const { data: groups } = api.group.list.useQuery({
    organizationId: orgId,
  });

  const membership = data?.currentUserMembership;

  const utils = api.useUtils();

  const createMutation = api.group.create.useMutation({
    onSuccess: () => {
      void utils.group.list.invalidate();
      void utils.group.getHierarchy.invalidate();
      router.push(`/orgs/${orgId}/groups`);
    },
    onError: (error) => {
      if (error.message.includes("name")) {
        setNameError(error.message);
      }
    },
  });

  if (membershipLoading) {
    return (
      <Container size="sm" py="xl">
        <Skeleton height={36} width={200} mb="xs" />
        <Skeleton height={20} width={300} mb="xl" />
      </Container>
    );
  }

  if (membership?.role !== "ADMIN") {
    router.push(`/orgs/${orgId}/groups`);
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNameError("");
    setDescriptionError("");

    let hasError = false;

    if (!name.trim()) {
      setNameError("Group name is required");
      hasError = true;
    } else if (name.length > 100) {
      setNameError("Group name must be 100 characters or less");
      hasError = true;
    }

    if (description && description.length > 500) {
      setDescriptionError("Description must be 500 characters or less");
      hasError = true;
    }

    if (hasError) return;

    createMutation.mutate({
      organizationId: orgId,
      name: name.trim(),
      description: description.trim() || undefined,
      parentGroupId: parentGroupId ?? undefined,
    });
  };

  return (
    <Container size="sm" py="xl">
      <Title order={1} mb="xs">Create Group</Title>
      <Text c="dimmed" mb="xl">
        Create a new group for your organization&apos;s org chart.
      </Text>

      <Card withBorder p="lg">
        <form onSubmit={handleSubmit}>
          <TextInput
            label="Group Name"
            placeholder="Engineering, Sales, Marketing, etc."
            value={name}
            onChange={(e) => {
              setName(e.currentTarget.value);
              setNameError("");
            }}
            error={nameError}
            disabled={createMutation.isPending}
            required
            maxLength={100}
            description={`${name.length}/100 characters`}
            mb="md"
          />

          <Textarea
            label="Description"
            description={`${description.length}/500 characters (optional)`}
            placeholder="Brief description of this group..."
            value={description}
            onChange={(e) => {
              setDescription(e.currentTarget.value);
              setDescriptionError("");
            }}
            error={descriptionError}
            disabled={createMutation.isPending}
            maxLength={500}
            rows={3}
            mb="md"
          />

          <Select
            label="Parent Group"
            description="Select a parent to nest this group under another group in the org chart (optional)"
            placeholder="No parent (root group)"
            value={parentGroupId}
            onChange={setParentGroupId}
            data={[
              { value: "", label: "No parent (root group)" },
              ...(groups?.map((group: { id: string; name: string }) => ({
                value: group.id,
                label: group.name,
              })) ?? []),
            ]}
            disabled={createMutation.isPending}
            mb="md"
            clearable
          />

          {createMutation.error && !nameError && (
            <Alert color="red" mb="md">
              {createMutation.error.message}
            </Alert>
          )}

          <Group>
            <Button type="submit" loading={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Group"}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/orgs/${orgId}/groups`)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
          </Group>
        </form>
      </Card>
    </Container>
  );
}
