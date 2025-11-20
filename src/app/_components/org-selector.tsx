"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Menu, Button, Text, Divider } from "@mantine/core";
import { api } from "~/trpc/react";

export function OrgSelector() {
  const router = useRouter();
  const params = useParams();
  const currentOrgId = params.orgId as string;

  const { data: organizations } = api.organization.list.useQuery();
  const { data: currentOrg } = api.organization.getById.useQuery(
    { id: currentOrgId },
    { enabled: !!currentOrgId }
  );

  const handleOrgChange = (orgId: string) => {
    router.push(`/orgs/${orgId}/dashboard`);
  };

  if (!currentOrg) {
    return (
      <Text size="sm" c="dimmed">
        Loading organization...
      </Text>
    );
  }

  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <Button variant="outline" color="gray">
          {currentOrg.name}
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Your Organizations</Menu.Label>
        {organizations?.map((org) => (
          <Menu.Item
            key={org.id}
            onClick={() => handleOrgChange(org.id)}
            bg={org.id === currentOrgId ? "indigo.0" : undefined}
          >
            {org.name}
            {org.id === currentOrgId && (
              <Text span size="xs" c="indigo.6" ml="xs">
                (current)
              </Text>
            )}
          </Menu.Item>
        ))}
        <Divider />
        <Menu.Item component={Link} href="/app/organizations/new">
          + Create New Organization
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
