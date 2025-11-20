"use client";

import { useParams } from "next/navigation";
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
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Message Board</h1>
        <p className="mt-2 text-gray-600">
          Share updates and chat with your team
        </p>
      </div>

      {/* Message input form */}
      <form
        onSubmit={handleSubmit}
        className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      >
        <label htmlFor="message" className="mb-2 block text-sm font-medium text-gray-900">
          Post a message
        </label>
        <textarea
          id="message"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="What's on your mind?"
          className="block w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={3}
          maxLength={1000}
        />
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {newMessage.length}/1000 characters
          </span>
          <button
            type="submit"
            disabled={createMutation.isPending || !newMessage.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {createMutation.isPending ? "Posting..." : "Post Message"}
          </button>
        </div>
        {createMutation.error && (
          <div className="mt-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-600">{createMutation.error.message}</p>
          </div>
        )}
      </form>

      {/* Messages list */}
      {isLoading ? (
        <div className="text-center text-gray-600">Loading messages...</div>
      ) : messages?.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No messages yet</h3>
          <p className="mt-2 text-gray-600">Be the first to post a message to the board.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages?.map((message) => (
            <div
              key={message.id}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {message.author.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={message.author.image}
                      alt=""
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                      {message.author.name?.charAt(0).toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {message.author.name ?? "Anonymous"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(message.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-gray-700">{message.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
