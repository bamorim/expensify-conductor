"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
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
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading settings...</div>
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">Organization not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Organization Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage your organization details and members
        </p>
      </div>

      <div className="space-y-8">
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
      </div>
    </div>
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
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">
        Organization Details
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Organization ID
          </label>
          <p className="mt-1 font-mono text-sm text-gray-600">{org.id}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Created
          </label>
          <p className="mt-1 text-sm text-gray-600">
            {new Date(org.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div>
          <label htmlFor="org-name" className="block text-sm font-medium text-gray-700">
            Organization Name
          </label>
          {isEditing && isAdmin ? (
            <form onSubmit={handleSubmit} className="mt-1 space-y-2">
              <input
                type="text"
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={updateOrg.isPending}
                aria-required="true"
                aria-invalid={!!error}
                aria-describedby={error ? "name-error" : undefined}
              />
              {error && (
                <p id="name-error" className="text-sm text-red-600">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={updateOrg.isPending}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {updateOrg.isPending ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setName(org.name);
                    setError("");
                  }}
                  disabled={updateOrg.isPending}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-1 flex items-center gap-2">
              <p className="text-sm text-gray-900">{org.name}</p>
              {isAdmin && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                  aria-label="Edit organization name"
                >
                  Edit
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
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
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
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
      role,
    });
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">Invite Member</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <input
            type="email"
            id="invite-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="user@example.com"
            disabled={inviteUser.isPending}
            aria-required="true"
            aria-invalid={!!error}
            aria-describedby={error ? "invite-error" : success ? "invite-success" : undefined}
          />
        </div>

        <div>
          <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700">
            Role
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as "ADMIN" | "MEMBER")}
            className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={inviteUser.isPending}
          >
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        {error && (
          <div
            id="invite-error"
            className="rounded-md border border-red-200 bg-red-50 p-3"
            role="alert"
          >
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div
            id="invite-success"
            className="rounded-md border border-green-200 bg-green-50 p-3"
            role="status"
            aria-live="polite"
          >
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={inviteUser.isPending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {inviteUser.isPending ? "Inviting..." : "Send Invitation"}
        </button>
      </form>
    </section>
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
    if (
      confirm(
        `Are you sure you want to remove ${userName} from this organization?`
      )
    ) {
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
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">
        Members ({members.length})
      </h2>

      {members.length === 0 ? (
        <p className="text-sm text-gray-600">No members yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Email
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Role
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Joined
                </th>
                {isAdmin && (
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {members.map((member) => (
                <tr key={member.userId} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900">
                    {member.user.name ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600">
                    {member.user.email ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm">
                    {isAdmin ? (
                      <select
                        value={member.role}
                        onChange={(e) =>
                          handleRoleChange(
                            member.userId,
                            e.target.value as "ADMIN" | "MEMBER"
                          )
                        }
                        disabled={changingRoleUserId === member.userId}
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Change role for ${member.user.name ?? member.user.email ?? "user"}`}
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="MEMBER">MEMBER</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          member.role === "ADMIN"
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {member.role}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600">
                    {new Date(member.createdAt).toLocaleDateString()}
                  </td>
                  {isAdmin && (
                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm">
                      <button
                        onClick={() =>
                          handleRemoveMember(
                            member.userId,
                            member.user.name ?? member.user.email ?? "user"
                          )
                        }
                        disabled={removingUserId === member.userId}
                        className="text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Remove ${member.user.name ?? member.user.email ?? "user"}`}
                      >
                        {removingUserId === member.userId ? "Removing..." : "Remove"}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
