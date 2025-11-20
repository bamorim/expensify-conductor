"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Container, Title, Text, TextInput, Button, Group, Card } from "@mantine/core";
import { api } from "~/trpc/react";

export default function NewOrganizationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const createOrg = api.organization.create.useMutation({
    onSuccess: (org) => {
      router.push(`/orgs/${org.id}/dashboard`);
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

    createOrg.mutate({ name: name.trim() });
  };

  return (
    <Container size="sm" py="xl">
      <Title order={1} mb="xs">
        Create New Organization
      </Title>
      <Text c="dimmed" mb="xl">
        Set up a new organization to manage expenses and policies.
      </Text>

      <Card withBorder p="lg">
        <form onSubmit={handleSubmit}>
          <TextInput
            label="Organization Name"
            placeholder="Acme Corporation"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            error={error}
            disabled={createOrg.isPending}
            required
            mb="lg"
          />

          <Group>
            <Button type="submit" loading={createOrg.isPending}>
              {createOrg.isPending ? "Creating..." : "Create Organization"}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={createOrg.isPending}
            >
              Cancel
            </Button>
          </Group>
        </form>
      </Card>
    </Container>
  );
}
