"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Container, Title, Button, Table, Text, Card, Stack, Group, Modal, Skeleton } from "@mantine/core";
import { api } from "~/trpc/react";

export default function CategoriesPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: categories, isLoading } = api.category.list.useQuery({
    organizationId: orgId,
  });

  const { data } = api.organization.getById.useQuery({
    id: orgId,
  });

  const membership = data?.currentUserMembership;

  const utils = api.useUtils();
  const deleteMutation = api.category.delete.useMutation({
    onSuccess: () => {
      setDeleteId(null);
      void utils.category.list.invalidate();
    },
  });

  const isAdmin = membership?.role === "ADMIN";

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <Group justify="space-between" mb="xl">
          <Skeleton height={36} width={200} />
          <Skeleton height={36} width={150} />
        </Group>
        <Card withBorder>
          <Stack gap="md">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height={60} />
            ))}
          </Stack>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Categories</Title>
        {isAdmin && (
          <Button onClick={() => router.push(`/orgs/${orgId}/categories/new`)}>
            Create Category
          </Button>
        )}
      </Group>

      {!categories || categories.length === 0 ? (
        <Card withBorder p="xl" ta="center">
          <Stack align="center" gap="md">
            <Title order={3}>No categories yet</Title>
            <Text c="dimmed">
              Categories help organize expenses by type (travel, meals, equipment, etc.).
            </Text>
            {isAdmin && (
              <Button onClick={() => router.push(`/orgs/${orgId}/categories/new`)}>
                Create Your First Category
              </Button>
            )}
          </Stack>
        </Card>
      ) : (
        <Card withBorder p={0}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Description</Table.Th>
                {isAdmin && <Table.Th ta="right">Actions</Table.Th>}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {categories.map((category) => (
                <Table.Tr key={category.id}>
                  <Table.Td fw={500}>{category.name}</Table.Td>
                  <Table.Td>
                    {category.description ?? (
                      <Text fs="italic" c="dimmed">
                        No description
                      </Text>
                    )}
                  </Table.Td>
                  {isAdmin && (
                    <Table.Td ta="right">
                      <Group gap="xs" justify="flex-end">
                        <Button
                          variant="subtle"
                          size="xs"
                          onClick={() => router.push(`/orgs/${orgId}/categories/${category.id}`)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="subtle"
                          color="red"
                          size="xs"
                          onClick={() => setDeleteId(category.id)}
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
      )}

      <Modal
        opened={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Category"
        centered
      >
        <Text mb="md">
          Are you sure you want to delete &quot;{categories?.find((c) => c.id === deleteId)?.name}&quot;? This action cannot be undone.
        </Text>
        {deleteMutation.error && (
          <Text c="red" size="sm" mb="md">
            {deleteMutation.error.message}
          </Text>
        )}
        <Group justify="flex-end" gap="sm">
          <Button
            variant="outline"
            onClick={() => setDeleteId(null)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            color="red"
            onClick={() => deleteId && handleDelete(deleteId)}
            loading={deleteMutation.isPending}
          >
            Delete
          </Button>
        </Group>
      </Modal>
    </Container>
  );
}
