"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Container, Title, Text, TextInput, Textarea, Select, Button, Group, Card, Alert, Anchor } from "@mantine/core";
import { api } from "~/trpc/react";
import { useState } from "react";

export default function NewExpensePage() {
  const params = useParams<{ orgId: string }>();
  const router = useRouter();
  const orgId = params.orgId;

  const [categoryId, setCategoryId] = useState<string | null>("");
  const [amount, setAmount] = useState<string | number>("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const { data: categories } = api.category.list.useQuery({
    organizationId: orgId,
  });

  const { data: policies } = api.policy.list.useQuery({
    organizationId: orgId,
  });

  const utils = api.useUtils();

  const submitExpenseMutation = api.expense.submit.useMutation({
    onSuccess: (data) => {
      setSuccessMessage(data.message);
      void utils.expense.list.invalidate();
      setTimeout(() => {
        router.push(`/orgs/${orgId}/expenses`);
      }, 2000);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const applicablePolicy = categoryId
    ? policies?.find((p) => p.categoryId === categoryId && p.userId === null) ?? null
    : null;

  const amountValue = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  const exceedsLimit =
    applicablePolicy && amountValue > applicablePolicy.maxAmount / 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!categoryId) {
      setError("Please select a category");
      return;
    }

    if (!amount || amountValue <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    if (!date) {
      setError("Please select a date");
      return;
    }

    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (selectedDate > today) {
      setError("Date cannot be in the future");
      return;
    }

    if (!description.trim()) {
      setError("Please provide a description");
      return;
    }

    if (description.length > 500) {
      setError("Description must be 500 characters or less");
      return;
    }

    submitExpenseMutation.mutate({
      organizationId: orgId,
      categoryId,
      amount: Math.round(amountValue * 100),
      date: new Date(date),
      description: description.trim(),
    });
  };

  return (
    <Container size="sm" py="xl">
      <Anchor component={Link} href={`/orgs/${orgId}/expenses`} size="sm" mb="md">
        Back to Expenses
      </Anchor>
      <Title order={1} mb="xs">Submit Expense</Title>
      <Text c="dimmed" mb="xl">
        Submit a new expense for reimbursement
      </Text>

      <Card withBorder p="lg">
        <form onSubmit={handleSubmit}>
          {error && (
            <Alert color="red" mb="md">
              {error}
            </Alert>
          )}

          {successMessage && (
            <Alert
              color={
                successMessage.includes("auto-approved")
                  ? "green"
                  : successMessage.includes("auto-rejected")
                    ? "red"
                    : "blue"
              }
              mb="md"
            >
              {successMessage}
            </Alert>
          )}

          <Select
            label="Category"
            placeholder="Select a category"
            value={categoryId}
            onChange={(value) => {
              setCategoryId(value);
              setError("");
            }}
            data={categories?.map((category) => ({
              value: category.id,
              label: category.name,
            })) ?? []}
            disabled={submitExpenseMutation.isPending}
            required
            mb="md"
          />

          {categoryId && applicablePolicy && (
            <Alert color="blue" mb="md" title="Policy Information">
              <Text size="sm">
                <strong>Max Amount:</strong> ${(applicablePolicy.maxAmount / 100).toFixed(2)} per {applicablePolicy.period.toLowerCase()}
              </Text>
              <Text size="sm">
                <strong>Review:</strong> {applicablePolicy.autoApprove ? "Auto-approved (if within limit)" : "Manual review required"}
              </Text>
            </Alert>
          )}

          <TextInput
            label="Amount (USD)"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.currentTarget.value);
              setError("");
            }}
            leftSection="$"
            type="number"
            min={0.01}
            step={0.01}
            disabled={submitExpenseMutation.isPending}
            required
            mb="md"
            error={exceedsLimit ? "Amount exceeds policy limit. This expense may be auto-rejected." : undefined}
          />

          <TextInput
            label="Date"
            type="date"
            value={date}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => {
              setDate(e.currentTarget.value);
              setError("");
            }}
            description="Date of the expense (cannot be in the future)"
            disabled={submitExpenseMutation.isPending}
            required
            mb="md"
          />

          <Textarea
            label="Description"
            placeholder="Brief description of the expense..."
            value={description}
            onChange={(e) => {
              setDescription(e.currentTarget.value);
              setError("");
            }}
            maxLength={500}
            description={`${description.length}/500 characters`}
            disabled={submitExpenseMutation.isPending}
            required
            rows={3}
            mb="md"
          />

          <Group>
            <Button type="submit" loading={submitExpenseMutation.isPending}>
              {submitExpenseMutation.isPending ? "Submitting..." : "Submit Expense"}
            </Button>
            <Button
              component={Link}
              href={`/orgs/${orgId}/expenses`}
              variant="outline"
            >
              Cancel
            </Button>
          </Group>
        </form>
      </Card>
    </Container>
  );
}
