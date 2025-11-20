"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Container, Title, Text, TextInput, Textarea, Button, Group, Card, Skeleton, Alert } from "@mantine/core";
import { api } from "~/trpc/react";

export default function NewCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");

  const { data, isLoading: membershipLoading } = api.organization.getById.useQuery({
    id: orgId,
  });

  const membership = data?.currentUserMembership;

  const utils = api.useUtils();

  const createMutation = api.category.create.useMutation({
    onSuccess: () => {
      void utils.category.list.invalidate();
      router.push(`/orgs/${orgId}/categories`);
    },
    onError: (error) => {
      if (error.message.includes("name already exists")) {
        setNameError(error.message);
      }
    },
  });

  if (membershipLoading) {
    return (
      <Container size="sm" py="xl">
        <Skeleton height={36} width={250} mb="xs" />
        <Skeleton height={20} width={350} mb="xl" />
      </Container>
    );
  }

  if (membership?.role !== "ADMIN") {
    router.push(`/orgs/${orgId}/categories`);
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNameError("");
    setDescriptionError("");

    let hasError = false;

    if (!name.trim()) {
      setNameError("Category name is required");
      hasError = true;
    } else if (name.length > 100) {
      setNameError("Category name must be 100 characters or less");
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
    });
  };

  return (
    <Container size="sm" py="xl">
      <Title order={1} mb="xs">Create Category</Title>
      <Text c="dimmed" mb="xl">
        Create a new expense category for your organization.
      </Text>

      <Card withBorder p="lg">
        <form onSubmit={handleSubmit}>
          <TextInput
            label="Category Name"
            placeholder="Travel, Meals, Equipment, etc."
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
            placeholder="Brief description of this category..."
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

          {createMutation.error && !nameError && (
            <Alert color="red" mb="md">
              {createMutation.error.message}
            </Alert>
          )}

          <Group>
            <Button type="submit" loading={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Category"}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/orgs/${orgId}/categories`)}
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
