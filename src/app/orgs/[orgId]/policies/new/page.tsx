"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { useState } from "react";

export default function NewPolicyPage() {
  const params = useParams<{ orgId: string }>();
  const router = useRouter();
  const orgId = params.orgId;

  const [scope, setScope] = useState<"org" | "user">("org");
  const [userId, setUserId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [period, setPeriod] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [autoApprove, setAutoApprove] = useState(false);
  const [error, setError] = useState("");

  const { data: categories } = api.category.list.useQuery({
    organizationId: orgId,
  });

  const { data: members } = api.organization.listMembers.useQuery({
    organizationId: orgId,
  });

  const utils = api.useUtils();

  const createPolicyMutation = api.policy.create.useMutation({
    onSuccess: () => {
      utils.policy.list.invalidate();
      router.push(`/orgs/${orgId}/policies`);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!categoryId) {
      setError("Please select a category");
      return;
    }

    if (!maxAmount || parseFloat(maxAmount) <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    if (scope === "user" && !userId) {
      setError("Please select a user for user-specific policy");
      return;
    }

    const amountInCents = Math.round(parseFloat(maxAmount) * 100);

    createPolicyMutation.mutate({
      organizationId: orgId,
      categoryId,
      userId: scope === "user" ? userId : undefined,
      maxAmount: amountInCents,
      period,
      autoApprove,
    });
  };

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link
          href={`/orgs/${orgId}/policies`}
          className="mb-4 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700"
        >
          ← Back to Policies
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Create Policy</h1>
      </div>

      <div className="mx-auto max-w-2xl">
        <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow">
          {error && (
            <div className="mb-6 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Policy Scope
            </label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="scope-org"
                  name="scope"
                  value="org"
                  checked={scope === "org"}
                  onChange={(e) => setScope(e.target.value as "org")}
                  className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="scope-org" className="ml-3 block text-sm text-gray-700">
                  Organization-wide policy
                  <span className="ml-2 text-xs text-gray-500">
                    (applies to all users)
                  </span>
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="scope-user"
                  name="scope"
                  value="user"
                  checked={scope === "user"}
                  onChange={(e) => setScope(e.target.value as "user")}
                  className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="scope-user" className="ml-3 block text-sm text-gray-700">
                  User-specific policy
                  <span className="ml-2 text-xs text-gray-500">
                    (overrides organization policy)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {scope === "user" && (
            <div className="mb-6">
              <label
                htmlFor="user"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                User <span className="text-red-500">*</span>
              </label>
              <select
                id="user"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                required={scope === "user"}
                aria-required={scope === "user"}
              >
                <option value="">Select a user</option>
                {members?.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.user.name ?? member.user.email}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                This policy will only apply to the selected user
              </p>
            </div>
          )}

          <div className="mb-6">
            <label
              htmlFor="category"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              required
              aria-required="true"
            >
              <option value="">Select a category</option>
              {categories?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label
              htmlFor="maxAmount"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Maximum Amount (USD) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-2 text-gray-500">
                $
              </span>
              <input
                type="number"
                id="maxAmount"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                min="0.01"
                step="0.01"
                className="block w-full rounded-md border border-gray-300 py-2 pl-7 pr-4 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                placeholder="0.00"
                required
                aria-required="true"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Maximum amount allowed per period
            </p>
          </div>

          <div className="mb-6">
            <label
              htmlFor="period"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Period <span className="text-red-500">*</span>
            </label>
            <select
              id="period"
              value={period}
              onChange={(e) => setPeriod(e.target.value as "MONTHLY" | "YEARLY")}
              className="block w-full rounded-md border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              required
              aria-required="true"
            >
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Time period for the spending limit
            </p>
          </div>

          <div className="mb-6">
            <div className="flex items-start">
              <div className="flex h-5 items-center">
                <input
                  type="checkbox"
                  id="autoApprove"
                  checked={autoApprove}
                  onChange={(e) => setAutoApprove(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="autoApprove" className="text-sm font-medium text-gray-700">
                  Auto-approve compliant expenses
                </label>
                <p className="text-xs text-gray-500">
                  {autoApprove
                    ? "Expenses within this policy's limits will be automatically approved"
                    : "Expenses within this policy's limits will require manual review"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href={`/orgs/${orgId}/policies`}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={createPolicyMutation.isPending}
            >
              {createPolicyMutation.isPending ? "Creating..." : "Create Policy"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
