"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";

export default function CategoriesPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: categories, isLoading } = api.category.list.useQuery({
    organizationId: orgId,
  });

  const { data: membership } = api.organization.getCurrentMembership.useQuery({
    organizationId: orgId,
  });

  const utils = api.useUtils();
  const deleteMutation = api.category.delete.useMutation({
    onSuccess: () => {
      setDeleteId(null);
      void utils.category.list.invalidate();
    },
  });

  const isAdmin = membership?.role === "ADMIN";

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  if (isLoading) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="h-9 w-48 animate-pulse rounded bg-gray-200"></div>
          <div className="h-10 w-36 animate-pulse rounded-lg bg-gray-200"></div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded bg-gray-100"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
        {isAdmin && (
          <button
            onClick={() => router.push(`/orgs/${orgId}/categories/new`)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            Create Category
          </button>
        )}
      </div>

      {!categories || categories.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            No categories yet
          </h3>
          <p className="mb-4 text-gray-600">
            Categories help organize expenses by type (travel, meals, equipment,
            etc.).
          </p>
          {isAdmin && (
            <button
              onClick={() => router.push(`/orgs/${orgId}/categories/new`)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
            >
              Create Your First Category
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Description
                  </th>
                  {isAdmin && (
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {category.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {category.description || (
                        <span className="italic text-gray-400">
                          No description
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <button
                          onClick={() =>
                            router.push(`/orgs/${orgId}/categories/${category.id}`)
                          }
                          className="mr-4 text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteId(category.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {deleteId && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-50"
            onClick={() => setDeleteId(null)}
            aria-hidden="true"
          />
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h2
                id="delete-dialog-title"
                className="mb-4 text-xl font-semibold text-gray-900"
              >
                Delete Category
              </h2>
              <p className="mb-6 text-gray-600">
                Are you sure you want to delete &quot;
                {categories?.find((c) => c.id === deleteId)?.name}&quot;? This
                action cannot be undone.
              </p>
              {deleteMutation.error && (
                <div className="mb-4 rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-600">
                    {deleteMutation.error.message}
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  disabled={deleteMutation.isPending}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  disabled={deleteMutation.isPending}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
