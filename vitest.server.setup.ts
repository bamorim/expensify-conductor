import { afterAll, beforeEach, vi } from "vitest";

// Setup transactional testing
vi.mock("~/server/db");

// Mock the auth module
vi.mock("~/server/auth", () => ({
  auth: vi.fn(),
}));

afterAll(() => {
  vi.clearAllMocks();
});