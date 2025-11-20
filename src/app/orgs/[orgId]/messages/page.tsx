"use client";

import { useParams } from "next/navigation";
import { Container, Title, Text, Textarea, Button, Card, Stack, Group, Alert, Avatar, Loader, Center } from "@mantine/core";
import { api } from "~/trpc/react";
import { useState } from "react";

export default function MessagesPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;
  const [newMessage, setNewMessage] = useState("");

  const { data: messages, isLoading } = api.message.list.useQuery({
    organizationId: orgId,
  });

  const utils = api.useUtils();
  const createMutation = api.message.create.useMutation({
    onSuccess: () => {
      setNewMessage("");
      void utils.message.list.invalidate();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    createMutation.mutate({
      organizationId: orgId,
      content: newMessage,
    });
  };

  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="xs">Message Board</Title>
      <Text c="dimmed" mb="xl">
        Share updates and chat with your team
      </Text>

      <Card withBorder p="lg" mb="xl">
        <form onSubmit={handleSubmit}>
          <Textarea
            label="Post a message"
            placeholder="What's on your mind?"
            value={newMessage}
            onChange={(e) => setNewMessage(e.currentTarget.value)}
            rows={3}
            maxLength={1000}
            mb="sm"
          />
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {newMessage.length}/1000 characters
            </Text>
            <Button
              type="submit"
              loading={createMutation.isPending}
              disabled={!newMessage.trim()}
            >
              Post Message
            </Button>
          </Group>
          {createMutation.error && (
            <Alert color="red" mt="md">
              {createMutation.error.message}
            </Alert>
          )}
        </form>
      </Card>

      {isLoading ? (
        <Center py="xl">
          <Loader />
        </Center>
      ) : messages?.length === 0 ? (
        <Card withBorder p="xl" ta="center">
          <Stack align="center" gap="md">
            <Title order={3}>No messages yet</Title>
            <Text c="dimmed">Be the first to post a message to the board.</Text>
          </Stack>
        </Card>
      ) : (
        <Stack gap="md">
          {messages?.map((message: { id: string; content: string; createdAt: Date; author: { name: string | null; email: string | null; image: string | null } }) => (
            <Card key={message.id} withBorder p="lg">
              <Group align="flex-start" gap="md">
                <Avatar
                  src={message.author.image}
                  alt=""
                  radius="xl"
                >
                  {(message.author.name ?? message.author.email)?.charAt(0).toUpperCase() ?? "?"}
                </Avatar>
                <div style={{ flex: 1 }}>
                  <Group justify="space-between" mb="xs">
                    <Text fw={500}>
                      {message.author.name ?? message.author.email ?? "Anonymous"}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {new Date(message.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </Text>
                  </Group>
                  <Text style={{ whiteSpace: "pre-wrap" }}>{message.content}</Text>
                </div>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
}
