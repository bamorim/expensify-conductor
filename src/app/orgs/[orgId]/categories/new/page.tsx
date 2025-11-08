"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";

export default function NewCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");

  const { data: membership, isLoading: membershipLoading } =
    api.organization.getCurrentMembership.useQuery({
      organizationId: orgId,
    });

  const utils = api.useUtils()

  const createMutation = api.category.create.useMutation({
    onSuccess: () => {
      void utils.category.list.invalidate();
      router.push(`/orgs/${orgId}/categories`);
    },
    onError: (error) => {
      if (error.message.includes("name already exists")) {
        setNameError(error.message);
      }
    },
  });

  if (membershipLoading) {
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

  if (membership?.role !== "ADMIN") {
    router.push(`/orgs/${orgId}/categories`);
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNameError("");
    setDescriptionError("");

    let hasError = false;

    if (!name.trim()) {
      setNameError("Category name is required");
      hasError = true;
    } else if (name.length > 100) {
      setNameError("Category name must be 100 characters or less");
      hasError = true;
    }

    if (description && description.length > 500) {
      setDescriptionError("Description must be 500 characters or less");
      hasError = true;
    }

    if (hasError) return;

    createMutation.mutate({
      organizationId: orgId,
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create Category</h1>
          <p className="mt-2 text-sm text-gray-600">
            Create a new expense category for your organization.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-6">
            <label
              htmlFor="category-name"
              className="mb-2 block text-sm font-medium text-gray-900"
            >
              Category Name
              <span className="ml-1 text-red-500" aria-label="required">
                *
              </span>
            </label>
            <input
              type="text"
              id="category-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError("");
              }}
              className="block w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Travel, Meals, Equipment, etc."
              disabled={createMutation.isPending}
              maxLength={100}
              aria-required="true"
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "name-error" : "name-hint"}
            />
            <p id="name-hint" className="mt-1 text-xs text-gray-500">
              {name.length}/100 characters
            </p>
            {nameError && (
              <p id="name-error" className="mt-2 text-sm text-red-600">
                {nameError}
              </p>
            )}
          </div>

          <div className="mb-6">
            <label
              htmlFor="category-description"
              className="mb-2 block text-sm font-medium text-gray-900"
            >
              Description
              <span className="ml-1 text-sm font-normal text-gray-500">
                (optional)
              </span>
            </label>
            <textarea
              id="category-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setDescriptionError("");
              }}
              rows={3}
              className="block w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Brief description of this category..."
              disabled={createMutation.isPending}
              maxLength={500}
              aria-invalid={!!descriptionError}
              aria-describedby={
                descriptionError ? "description-error" : "description-hint"
              }
            />
            <p id="description-hint" className="mt-1 text-xs text-gray-500">
              {description.length}/500 characters
            </p>
            {descriptionError && (
              <p id="description-error" className="mt-2 text-sm text-red-600">
                {descriptionError}
              </p>
            )}
          </div>

          {createMutation.error && !nameError && (
            <div className="mb-6 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-600">
                {createMutation.error.message}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating..." : "Create Category"}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/orgs/${orgId}/categories`)}
              disabled={createMutation.isPending}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
