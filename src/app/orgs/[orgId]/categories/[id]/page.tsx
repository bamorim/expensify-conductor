"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Container, Title, Text, TextInput, Textarea, Button, Group, Card, Skeleton, Alert, Stack } from "@mantine/core";
import { api } from "~/trpc/react";

export default function EditCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const categoryId = params.id as string;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");

  const {
    data: category,
    isLoading,
    error: loadError,
  } = api.category.getById.useQuery({
    id: categoryId,
  });

  const { data } = api.organization.getById.useQuery({
    id: orgId,
  });

  const membership = data?.currentUserMembership;

  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description ?? "");
    }
  }, [category]);

  const utils = api.useUtils();
  const updateMutation = api.category.update.useMutation({
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

    updateMutation.mutate({
      id: categoryId,
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  if (loadError) {
    return (
      <Container size="sm" py="xl">
        <Alert color="red" title="Error Loading Category">
          <Text size="sm" mb="md">{loadError.message}</Text>
          <Button
            variant="light"
            color="red"
            onClick={() => router.push(`/orgs/${orgId}/categories`)}
          >
            Back to Categories
          </Button>
        </Alert>
      </Container>
    );
  }

  if (isLoading || !membership) {
    return (
      <Container size="sm" py="xl">
        <Skeleton height={36} width={250} mb="xs" />
        <Skeleton height={20} width={200} mb="xl" />
        <Card withBorder p="lg">
          <Stack gap="md">
            <Skeleton height={60} />
            <Skeleton height={100} />
          </Stack>
        </Card>
      </Container>
    );
  }

  if (membership.role !== "ADMIN") {
    router.push(`/orgs/${orgId}/categories`);
    return null;
  }

  return (
    <Container size="sm" py="xl">
      <Title order={1} mb="xs">Edit Category</Title>
      <Text c="dimmed" mb="xl">
        Update the category details.
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
            disabled={updateMutation.isPending}
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
            disabled={updateMutation.isPending}
            maxLength={500}
            rows={3}
            mb="md"
          />

          {updateMutation.error && !nameError && (
            <Alert color="red" mb="md">
              {updateMutation.error.message}
            </Alert>
          )}

          <Group>
            <Button type="submit" loading={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/orgs/${orgId}/categories`)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
          </Group>
        </form>
      </Card>
    </Container>
  );
}
