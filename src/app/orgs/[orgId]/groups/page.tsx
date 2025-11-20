"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Container, Title, Button, Table, Text, Card, Stack, Group, Skeleton, SegmentedControl, Modal, Box } from "@mantine/core";
import { api } from "~/trpc/react";

export default function GroupsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<string>("hierarchy");

  const { data: groups, isLoading } = api.group.list.useQuery({
    organizationId: orgId,
  });

  const { data: hierarchy } = api.group.getHierarchy.useQuery({
    organizationId: orgId,
  });

  const { data } = api.organization.getById.useQuery({
    id: orgId,
  });

  const membership = data?.currentUserMembership;

  const utils = api.useUtils();
  const deleteMutation = api.group.delete.useMutation({
    onSuccess: () => {
      setDeleteId(null);
      void utils.group.list.invalidate();
      void utils.group.getHierarchy.invalidate();
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
          <Skeleton height={36} width={150} />
          <Skeleton height={36} width={130} />
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

  type HierarchyGroup = NonNullable<typeof hierarchy>[number];

  const renderGroupNode = (group: HierarchyGroup, depth = 0): React.ReactNode => {
    return (
      <Box key={group.id} ml={depth * 24}>
        <Card withBorder p="md" mb="xs">
          <Group justify="space-between">
            <Group gap="sm">
              {depth > 0 && (
                <Text c="dimmed">└</Text>
              )}
              <div>
                <Text fw={500}>{group.name}</Text>
                <Text size="sm" c="dimmed">
                  {group.members.length} member{group.members.length !== 1 ? "s" : ""}
                </Text>
              </div>
            </Group>
            {isAdmin && (
              <Group gap="xs">
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => router.push(`/orgs/${orgId}/groups/${group.id}`)}
                >
                  Edit
                </Button>
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  onClick={() => setDeleteId(group.id)}
                >
                  Delete
                </Button>
              </Group>
            )}
          </Group>
        </Card>
        {group.children?.map((child) => renderGroupNode(child as HierarchyGroup, depth + 1))}
      </Box>
    );
  };

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl" wrap="wrap">
        <Title order={1}>Groups</Title>
        <Group gap="md">
          <SegmentedControl
            value={viewMode}
            onChange={setViewMode}
            data={[
              { label: "Org Chart", value: "hierarchy" },
              { label: "List", value: "list" },
            ]}
          />
          {isAdmin && (
            <Button onClick={() => router.push(`/orgs/${orgId}/groups/new`)}>
              Create Group
            </Button>
          )}
        </Group>
      </Group>

      {!groups || groups.length === 0 ? (
        <Card withBorder p="xl" ta="center">
          <Stack align="center" gap="md">
            <Title order={3}>No groups yet</Title>
            <Text c="dimmed">
              Groups help organize users into teams and departments for your org chart.
            </Text>
            {isAdmin && (
              <Button onClick={() => router.push(`/orgs/${orgId}/groups/new`)}>
                Create Your First Group
              </Button>
            )}
          </Stack>
        </Card>
      ) : viewMode === "hierarchy" ? (
        <Stack gap="xs">
          {hierarchy?.map((group) => renderGroupNode(group))}
        </Stack>
      ) : (
        <Card withBorder p={0}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Parent Group</Table.Th>
                <Table.Th>Members</Table.Th>
                {isAdmin && <Table.Th ta="right">Actions</Table.Th>}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {groups.map((group: { id: string; name: string; parentGroup: { name: string } | null; members: unknown[] }) => (
                <Table.Tr key={group.id}>
                  <Table.Td fw={500}>{group.name}</Table.Td>
                  <Table.Td>
                    {group.parentGroup?.name ?? (
                      <Text fs="italic" c="dimmed">
                        No parent
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>{group.members.length}</Table.Td>
                  {isAdmin && (
                    <Table.Td ta="right">
                      <Group gap="xs" justify="flex-end">
                        <Button
                          variant="subtle"
                          size="xs"
                          onClick={() => router.push(`/orgs/${orgId}/groups/${group.id}`)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="subtle"
                          color="red"
                          size="xs"
                          onClick={() => setDeleteId(group.id)}
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
        title="Delete Group"
        centered
      >
        <Text mb="md">
          Are you sure you want to delete &quot;{groups?.find((g: { id: string; name: string }) => g.id === deleteId)?.name}&quot;? Child groups will be orphaned.
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
