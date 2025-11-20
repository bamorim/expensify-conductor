"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Container, Title, Text, TextInput, Select, Button, Group, Card, Table, Badge, Stack, Alert, Loader, Center } from "@mantine/core";
import { api } from "~/trpc/react";

export default function OrganizationSettingsPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const { data: org, isLoading: orgLoading } = api.organization.getById.useQuery(
    { id: orgId },
    { enabled: !!orgId }
  );

  const { data: members, isLoading: membersLoading, refetch: refetchMembers } = api.organization.listMembers.useQuery(
    { organizationId: orgId },
    { enabled: !!orgId }
  );

  const isAdmin = org?.currentUserMembership?.role === "ADMIN";

  if (orgLoading || membersLoading) {
    return (
      <Container size="xl" py="xl">
        <Center py="xl">
          <Loader />
        </Center>
      </Container>
    );
  }

  if (!org) {
    return (
      <Container size="xl" py="xl">
        <Alert color="red">Organization not found</Alert>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="xs">Organization Settings</Title>
      <Text c="dimmed" mb="xl">
        Manage your organization details and members
      </Text>

      <Stack gap="lg">
        <OrganizationDetailsSection org={org} isAdmin={isAdmin} />

        {isAdmin && (
          <InviteMemberSection orgId={orgId} onSuccess={() => refetchMembers()} />
        )}

        <MembersSection
          members={members ?? []}
          orgId={orgId}
          isAdmin={isAdmin}
          onUpdate={() => refetchMembers()}
        />
      </Stack>
    </Container>
  );
}

function OrganizationDetailsSection({
  org,
  isAdmin,
}: {
  org: { id: string; name: string; createdAt: Date };
  isAdmin: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(org.name);
  const [error, setError] = useState("");

  const utils = api.useUtils();
  const updateOrg = api.organization.update.useMutation({
    onSuccess: async () => {
      setIsEditing(false);
      setError("");
      await utils.organization.getById.invalidate({ id: org.id });
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Organization name is required");
      return;
    }

    updateOrg.mutate({ id: org.id, name: name.trim() });
  };

  return (
    <Card withBorder p="lg">
      <Title order={3} mb="md">Organization Details</Title>

      <Stack gap="md">
        <div>
          <Text size="sm" fw={500} c="dimmed">Organization ID</Text>
          <Text size="sm" ff="monospace">{org.id}</Text>
        </div>

        <div>
          <Text size="sm" fw={500} c="dimmed">Created</Text>
          <Text size="sm">{new Date(org.createdAt).toLocaleDateString()}</Text>
        </div>

        <div>
          <Text size="sm" fw={500} c="dimmed">Organization Name</Text>
          {isEditing && isAdmin ? (
            <form onSubmit={handleSubmit}>
              <Stack gap="sm" mt="xs">
                <TextInput
                  value={name}
                  onChange={(e) => setName(e.currentTarget.value)}
                  error={error}
                  disabled={updateOrg.isPending}
                />
                <Group>
                  <Button type="submit" size="xs" loading={updateOrg.isPending}>
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      setIsEditing(false);
                      setName(org.name);
                      setError("");
                    }}
                    disabled={updateOrg.isPending}
                  >
                    Cancel
                  </Button>
                </Group>
              </Stack>
            </form>
          ) : (
            <Group gap="sm">
              <Text size="sm">{org.name}</Text>
              {isAdmin && (
                <Button variant="subtle" size="xs" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
              )}
            </Group>
          )}
        </div>
      </Stack>
    </Card>
  );
}

function InviteMemberSection({
  orgId,
  onSuccess,
}: {
  orgId: string;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string | null>("MEMBER");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const inviteUser = api.organization.inviteUser.useMutation({
    onSuccess: () => {
      setEmail("");
      setRole("MEMBER");
      setError("");
      setSuccess("User invited successfully!");
      setTimeout(() => setSuccess(""), 3000);
      onSuccess();
    },
    onError: (err) => {
      setError(err.message);
      setSuccess("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    inviteUser.mutate({
      organizationId: orgId,
      email: email.trim(),
      role: role as "ADMIN" | "MEMBER",
    });
  };

  return (
    <Card withBorder p="lg">
      <Title order={3} mb="md">Invite Member</Title>

      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label="Email Address"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            disabled={inviteUser.isPending}
          />

          <Select
            label="Role"
            value={role}
            onChange={setRole}
            data={[
              { label: "Member", value: "MEMBER" },
              { label: "Admin", value: "ADMIN" },
            ]}
            disabled={inviteUser.isPending}
          />

          {error && <Alert color="red">{error}</Alert>}
          {success && <Alert color="green">{success}</Alert>}

          <Button type="submit" loading={inviteUser.isPending}>
            Send Invitation
          </Button>
        </Stack>
      </form>
    </Card>
  );
}

function MembersSection({
  members,
  orgId,
  isAdmin,
  onUpdate,
}: {
  members: Array<{
    userId: string;
    role: string;
    createdAt: Date;
    user: { id: string; name: string | null; email: string | null };
  }>;
  orgId: string;
  isAdmin: boolean;
  onUpdate: () => void;
}) {
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [changingRoleUserId, setChangingRoleUserId] = useState<string | null>(null);

  const removeMember = api.organization.removeMember.useMutation({
    onSuccess: () => {
      setRemovingUserId(null);
      onUpdate();
    },
    onError: (err) => {
      alert(err.message);
      setRemovingUserId(null);
    },
  });

  const updateMemberRole = api.organization.updateMemberRole.useMutation({
    onSuccess: () => {
      setChangingRoleUserId(null);
      onUpdate();
    },
    onError: (err) => {
      alert(err.message);
      setChangingRoleUserId(null);
    },
  });

  const handleRemoveMember = (userId: string, userName: string) => {
    if (confirm(`Are you sure you want to remove ${userName} from this organization?`)) {
      setRemovingUserId(userId);
      removeMember.mutate({ organizationId: orgId, userId });
    }
  };

  const handleRoleChange = (userId: string, newRole: "ADMIN" | "MEMBER") => {
    setChangingRoleUserId(userId);
    updateMemberRole.mutate({
      organizationId: orgId,
      userId,
      role: newRole,
    });
  };

  return (
    <Card withBorder p="lg">
      <Title order={3} mb="md">Members ({members.length})</Title>

      {members.length === 0 ? (
        <Text size="sm" c="dimmed">No members yet</Text>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Joined</Table.Th>
              {isAdmin && <Table.Th ta="right">Actions</Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {members.map((member) => (
              <Table.Tr key={member.userId}>
                <Table.Td fw={500}>{member.user.name ?? "-"}</Table.Td>
                <Table.Td>{member.user.email ?? "-"}</Table.Td>
                <Table.Td>
                  {isAdmin ? (
                    <Select
                      size="xs"
                      value={member.role}
                      onChange={(value) => handleRoleChange(member.userId, value as "ADMIN" | "MEMBER")}
                      data={[
                        { label: "Admin", value: "ADMIN" },
                        { label: "Member", value: "MEMBER" },
                      ]}
                      disabled={changingRoleUserId === member.userId}
                      w={100}
                    />
                  ) : (
                    <Badge color={member.role === "ADMIN" ? "indigo" : "gray"} variant="light">
                      {member.role}
                    </Badge>
                  )}
                </Table.Td>
                <Table.Td>{new Date(member.createdAt).toLocaleDateString()}</Table.Td>
                {isAdmin && (
                  <Table.Td ta="right">
                    <Button
                      variant="subtle"
                      color="red"
                      size="xs"
                      onClick={() =>
                        handleRemoveMember(
                          member.userId,
                          member.user.name ?? member.user.email ?? "user"
                        )
                      }
                      loading={removingUserId === member.userId}
                    >
                      Remove
                    </Button>
                  </Table.Td>
                )}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Card>
  );
}
