"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
  const [addMemberId, setAddMemberId] = useState("");
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: group, isLoading: groupLoading } = api.group.getById.useQuery(
    { id: groupId }
  );

  // Initialize form state when group data loads
  useEffect(() => {
    if (group && !isInitialized) {
      setName(group.name);
      setDescription(group.description || "");
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
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6">
            <div className="h-9 w-64 animate-pulse rounded bg-gray-200"></div>
            <div className="mt-2 h-4 w-96 animate-pulse rounded bg-gray-200"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Group not found</h2>
          <Link href={`/orgs/${orgId}/groups`} className="text-indigo-600 hover:text-indigo-900">
            Back to Groups
          </Link>
        </div>
      </div>
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

  // Filter out users who are already members
  const availableMembers = orgMembers?.filter(
    (m) => !group.members.some((gm) => gm.userId === m.userId)
  );

  // Filter out the current group and its descendants to prevent circular references
  const availableParentGroups = allGroups?.filter((g) => {
    if (g.id === groupId) return false;
    // Check if this group is a descendant of the current group
    let parentId = g.parentGroupId;
    while (parentId) {
      if (parentId === groupId) return false;
      const parentGroup = allGroups.find((ag) => ag.id === parentId);
      parentId = parentGroup?.parentGroupId ?? null;
    }
    return true;
  });

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link
            href={`/orgs/${orgId}/groups`}
            className="text-sm text-indigo-600 hover:text-indigo-900"
          >
            ← Back to Groups
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Edit Group</h1>
        </div>

        {isAdmin ? (
          <form
            onSubmit={handleSubmit}
            className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-6">
              <label
                htmlFor="group-name"
                className="mb-2 block text-sm font-medium text-gray-900"
              >
                Group Name
                <span className="ml-1 text-red-500" aria-label="required">
                  *
                </span>
              </label>
              <input
                type="text"
                id="group-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError("");
                }}
                className="block w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={updateMutation.isPending}
                maxLength={100}
              />
              <p className="mt-1 text-xs text-gray-500">
                {name.length}/100 characters
              </p>
              {nameError && (
                <p className="mt-2 text-sm text-red-600">{nameError}</p>
              )}
            </div>

            <div className="mb-6">
              <label
                htmlFor="group-description"
                className="mb-2 block text-sm font-medium text-gray-900"
              >
                Description
                <span className="ml-1 text-sm font-normal text-gray-500">
                  (optional)
                </span>
              </label>
              <textarea
                id="group-description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setDescriptionError("");
                }}
                rows={3}
                className="block w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={updateMutation.isPending}
                maxLength={500}
              />
              <p className="mt-1 text-xs text-gray-500">
                {description.length}/500 characters
              </p>
              {descriptionError && (
                <p className="mt-2 text-sm text-red-600">{descriptionError}</p>
              )}
            </div>

            <div className="mb-6">
              <label
                htmlFor="parent-group"
                className="mb-2 block text-sm font-medium text-gray-900"
              >
                Parent Group
                <span className="ml-1 text-sm font-normal text-gray-500">
                  (optional)
                </span>
              </label>
              <select
                id="parent-group"
                value={parentGroupId || ""}
                onChange={(e) => setParentGroupId(e.target.value || null)}
                className="block w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={updateMutation.isPending}
              >
                <option value="">No parent (root group)</option>
                {availableParentGroups?.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {updateMutation.error && !nameError && (
              <div className="mb-6 rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-600">
                  {updateMutation.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/orgs/${orgId}/groups`)}
                disabled={updateMutation.isPending}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">{group.name}</h2>
            {group.description && (
              <p className="mt-2 text-gray-600">{group.description}</p>
            )}
            {group.parentGroup && (
              <p className="mt-2 text-sm text-gray-500">
                Parent: {group.parentGroup.name}
              </p>
            )}
          </div>
        )}

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Members</h2>

          {isAdmin && availableMembers && availableMembers.length > 0 && (
            <div className="mb-6 flex gap-2">
              <select
                value={addMemberId}
                onChange={(e) => setAddMemberId(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={addMemberMutation.isPending}
              >
                <option value="">Select a member to add...</option>
                {availableMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name || m.user.email}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddMember}
                disabled={!addMemberId || addMemberMutation.isPending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {addMemberMutation.isPending ? "Adding..." : "Add"}
              </button>
            </div>
          )}

          {addMemberMutation.error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-600">
                {addMemberMutation.error.message}
              </p>
            </div>
          )}

          {group.members.length === 0 ? (
            <p className="text-gray-500 italic">No members in this group yet.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {group.members.map((gm) => (
                <li key={gm.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-gray-900">
                      {gm.user.name || "Unnamed User"}
                    </p>
                    <p className="text-sm text-gray-500">{gm.user.email}</p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => setRemoveMemberId(gm.userId)}
                      className="text-sm text-red-600 hover:text-red-900"
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {group.childGroups && group.childGroups.length > 0 && (
          <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Child Groups</h2>
            <ul className="divide-y divide-gray-200">
              {group.childGroups.map((child) => (
                <li key={child.id} className="py-3">
                  <Link
                    href={`/orgs/${orgId}/groups/${child.id}`}
                    className="font-medium text-indigo-600 hover:text-indigo-900"
                  >
                    {child.name}
                  </Link>
                  <p className="text-sm text-gray-500">
                    {child.members.length} member{child.members.length !== 1 ? "s" : ""}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {removeMemberId && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-50"
            onClick={() => setRemoveMemberId(null)}
            aria-hidden="true"
          />
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                Remove Member
              </h2>
              <p className="mb-6 text-gray-600">
                Are you sure you want to remove this member from the group?
              </p>
              {removeMemberMutation.error && (
                <div className="mb-4 rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-600">
                    {removeMemberMutation.error.message}
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setRemoveMemberId(null)}
                  disabled={removeMemberMutation.isPending}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRemoveMember(removeMemberId)}
                  disabled={removeMemberMutation.isPending}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {removeMemberMutation.isPending ? "Removing..." : "Remove"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
