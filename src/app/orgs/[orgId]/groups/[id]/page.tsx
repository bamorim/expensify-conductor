"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Container, Title, Text, TextInput, Textarea, Select, Button, Group, Card, Alert, Skeleton, Stack, Anchor, Modal } from "@mantine/core";
import { api } from "~/trpc/react";

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const groupId = params.id as string;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentGroupId, setParentGroupId] = useState<string | null>(null);
  const [nameError, setNameError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  const [addMemberId, setAddMemberId] = useState<string | null>("");
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: group, isLoading: groupLoading } = api.group.getById.useQuery(
    { id: groupId }
  );

  useEffect(() => {
    if (group && !isInitialized) {
      setName(group.name);
      setDescription(group.description ?? "");
      setParentGroupId(group.parentGroupId);
      setIsInitialized(true);
    }
  }, [group, isInitialized]);

  const { data: orgData } = api.organization.getById.useQuery({
    id: orgId,
  });

  const { data: allGroups } = api.group.list.useQuery({
    organizationId: orgId,
  });

  const { data: orgMembers } = api.organization.listMembers.useQuery({
    organizationId: orgId,
  });

  const membership = orgData?.currentUserMembership;
  const isAdmin = membership?.role === "ADMIN";

  const utils = api.useUtils();

  const updateMutation = api.group.update.useMutation({
    onSuccess: () => {
      void utils.group.getById.invalidate({ id: groupId });
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

  const addMemberMutation = api.group.addMember.useMutation({
    onSuccess: () => {
      setAddMemberId("");
      void utils.group.getById.invalidate({ id: groupId });
    },
  });

  const removeMemberMutation = api.group.removeMember.useMutation({
    onSuccess: () => {
      setRemoveMemberId(null);
      void utils.group.getById.invalidate({ id: groupId });
    },
  });

  if (groupLoading) {
    return (
      <Container size="sm" py="xl">
        <Skeleton height={36} width={200} mb="xs" />
        <Skeleton height={20} width={300} mb="xl" />
        <Card withBorder p="lg">
          <Stack gap="md">
            <Skeleton height={60} />
            <Skeleton height={100} />
          </Stack>
        </Card>
      </Container>
    );
  }

  if (!group) {
    return (
      <Container size="sm" py="xl">
        <Card withBorder p="lg" ta="center">
          <Title order={2} mb="xs">Group not found</Title>
          <Anchor component={Link} href={`/orgs/${orgId}/groups`}>
            Back to Groups
          </Anchor>
        </Card>
      </Container>
    );
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

    updateMutation.mutate({
      id: groupId,
      name: name.trim(),
      description: description.trim() || undefined,
      parentGroupId: parentGroupId,
    });
  };

  const handleAddMember = () => {
    if (!addMemberId) return;
    addMemberMutation.mutate({
      groupId,
      userId: addMemberId,
    });
  };

  const handleRemoveMember = (userId: string) => {
    removeMemberMutation.mutate({
      groupId,
      userId,
    });
  };

  const availableMembers = orgMembers?.filter(
    (m) => !group.members.some((gm: { userId: string }) => gm.userId === m.userId)
  );

  const availableParentGroups = allGroups?.filter((g: { id: string; parentGroupId: string | null }) => {
    if (g.id === groupId) return false;
    let pId = g.parentGroupId;
    while (pId) {
      if (pId === groupId) return false;
      const parentGroup = allGroups.find((ag: { id: string; parentGroupId: string | null }) => ag.id === pId);
      pId = parentGroup?.parentGroupId ?? null;
    }
    return true;
  });

  return (
    <Container size="sm" py="xl">
      <Anchor component={Link} href={`/orgs/${orgId}/groups`} size="sm" mb="md">
        Back to Groups
      </Anchor>
      <Title order={1} mb="xl">Edit Group</Title>

      {isAdmin ? (
        <Card withBorder p="lg" mb="lg">
          <form onSubmit={handleSubmit}>
            <TextInput
              label="Group Name"
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

            <Select
              label="Parent Group"
              description="(optional)"
              placeholder="No parent (root group)"
              value={parentGroupId ?? ""}
              onChange={(value) => setParentGroupId(value ?? null)}
              data={[
                { value: "", label: "No parent (root group)" },
                ...(availableParentGroups?.map((g: { id: string; name: string }) => ({
                  value: g.id,
                  label: g.name,
                })) ?? []),
              ]}
              disabled={updateMutation.isPending}
              mb="md"
              clearable
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
                onClick={() => router.push(`/orgs/${orgId}/groups`)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
            </Group>
          </form>
        </Card>
      ) : (
        <Card withBorder p="lg" mb="lg">
          <Title order={2}>{group.name}</Title>
          {group.description && (
            <Text mt="sm" c="dimmed">{group.description}</Text>
          )}
          {group.parentGroup && (
            <Text size="sm" c="dimmed" mt="sm">
              Parent: {group.parentGroup.name}
            </Text>
          )}
        </Card>
      )}

      <Card withBorder p="lg" mb="lg">
        <Title order={3} mb="md">Members</Title>

        {isAdmin && availableMembers && availableMembers.length > 0 && (
          <Group mb="md">
            <Select
              style={{ flex: 1 }}
              placeholder="Select a member to add..."
              value={addMemberId}
              onChange={setAddMemberId}
              data={availableMembers.map((m) => ({
                value: m.userId,
                label: m.user.name ?? m.user.email ?? "Unknown",
              }))}
              disabled={addMemberMutation.isPending}
            />
            <Button
              onClick={handleAddMember}
              disabled={!addMemberId || addMemberMutation.isPending}
              loading={addMemberMutation.isPending}
            >
              Add
            </Button>
          </Group>
        )}

        {addMemberMutation.error && (
          <Alert color="red" mb="md">
            {addMemberMutation.error.message}
          </Alert>
        )}

        {group.members.length === 0 ? (
          <Text c="dimmed" fs="italic">No members in this group yet.</Text>
        ) : (
          <Stack gap="sm">
            {group.members.map((gm: { id: string; userId: string; user: { name: string | null; email: string | null } }) => (
              <Group key={gm.id} justify="space-between">
                <div>
                  <Text fw={500}>{gm.user.name ?? "Unnamed User"}</Text>
                  <Text size="sm" c="dimmed">{gm.user.email}</Text>
                </div>
                {isAdmin && (
                  <Button
                    variant="subtle"
                    color="red"
                    size="xs"
                    onClick={() => setRemoveMemberId(gm.userId)}
                  >
                    Remove
                  </Button>
                )}
              </Group>
            ))}
          </Stack>
        )}
      </Card>

      {group.childGroups && group.childGroups.length > 0 && (
        <Card withBorder p="lg">
          <Title order={3} mb="md">Child Groups</Title>
          <Stack gap="sm">
            {group.childGroups.map((child: { id: string; name: string; members: unknown[] }) => (
              <div key={child.id}>
                <Anchor component={Link} href={`/orgs/${orgId}/groups/${child.id}`} fw={500}>
                  {child.name}
                </Anchor>
                <Text size="sm" c="dimmed">
                  {child.members.length} member{child.members.length !== 1 ? "s" : ""}
                </Text>
              </div>
            ))}
          </Stack>
        </Card>
      )}

      <Modal
        opened={!!removeMemberId}
        onClose={() => setRemoveMemberId(null)}
        title="Remove Member"
        centered
      >
        <Text mb="md">
          Are you sure you want to remove this member from the group?
        </Text>
        {removeMemberMutation.error && (
          <Text c="red" size="sm" mb="md">
            {removeMemberMutation.error.message}
          </Text>
        )}
        <Group justify="flex-end" gap="sm">
          <Button
            variant="outline"
            onClick={() => setRemoveMemberId(null)}
            disabled={removeMemberMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            color="red"
            onClick={() => removeMemberId && handleRemoveMember(removeMemberId)}
            loading={removeMemberMutation.isPending}
          >
            Remove
          </Button>
        </Group>
      </Modal>
    </Container>
  );
}
