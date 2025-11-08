import { describe, it, expect, vi, beforeEach } from "vitest";
import { organizationRouter } from "./organization";
import { db } from "~/server/db";
import {
  createTestUser,
  createTestOrganization,
  createMockSession,
} from "~/test/factories";

describe("OrganizationRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("should create an organization and add creator as admin", async () => {
      const user = await createTestUser();
      const session = createMockSession(user);

      const caller = organizationRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.create({ name: "Test Org" });

      expect(result.name).toBe("Test Org");
      expect(result.memberships).toHaveLength(1);
      expect(result.memberships[0]?.userId).toBe(user.id);
      expect(result.memberships[0]?.role).toBe("ADMIN");
    });
  });

  describe("list", () => {
    it("should list organizations user is a member of", async () => {
      const user = await createTestUser();
      const org1 = await createTestOrganization(user.id, { name: "Org 1" });
      const org2 = await createTestOrganization(user.id, { name: "Org 2" });

      const session = createMockSession(user);
      const caller = organizationRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.list();

      expect(result).toHaveLength(2);
      expect(result.map((o) => o.id)).toContain(org1.id);
      expect(result.map((o) => o.id)).toContain(org2.id);
    });

    it("should not list organizations user is not a member of", async () => {
      const user1 = await createTestUser({ email: "user1@example.com" });
      const user2 = await createTestUser({ email: "user2@example.com" });
      await createTestOrganization(user1.id, { name: "User 1 Org" });

      const session = createMockSession(user2);
      const caller = organizationRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.list();

      expect(result).toHaveLength(0);
    });
  });

  describe("getById", () => {
    it("should return organization details for members", async () => {
      const user = await createTestUser();
      const org = await createTestOrganization(user.id, { name: "Test Org" });

      const session = createMockSession(user);
      const caller = organizationRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.getById({ id: org.id });

      expect(result?.name).toBe("Test Org");
      expect(result?.memberships).toHaveLength(1);
    });

    it("should throw FORBIDDEN for non-members", async () => {
      const user1 = await createTestUser({ email: "user1@example.com" });
      const user2 = await createTestUser({ email: "user2@example.com" });
      const org = await createTestOrganization(user1.id);

      const session = createMockSession(user2);
      const caller = organizationRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(caller.getById({ id: org.id })).rejects.toThrow(
        "You are not a member of this organization",
      );
    });
  });

  describe("update", () => {
    it("should allow admins to update organization name", async () => {
      const user = await createTestUser();
      const org = await createTestOrganization(user.id, { name: "Old Name" });

      const session = createMockSession(user);
      const caller = organizationRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.update({ id: org.id, name: "New Name" });

      expect(result.name).toBe("New Name");
    });

    it("should throw FORBIDDEN for non-admin members", async () => {
      const admin = await createTestUser({ email: "admin@example.com" });
      const member = await createTestUser({ email: "member@example.com" });
      const org = await createTestOrganization(admin.id);

      await db.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: member.id,
          role: "MEMBER",
        },
      });

      const session = createMockSession(member);
      const caller = organizationRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.update({ id: org.id, name: "New Name" }),
      ).rejects.toThrow("Only admins can update organization details");
    });

    it("should throw FORBIDDEN for non-members", async () => {
      const user1 = await createTestUser({ email: "user1@example.com" });
      const user2 = await createTestUser({ email: "user2@example.com" });
      const org = await createTestOrganization(user1.id);

      const session = createMockSession(user2);
      const caller = organizationRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.update({ id: org.id, name: "New Name" }),
      ).rejects.toThrow("Only admins can update organization details");
    });
  });

  describe("inviteUser", () => {
    it("should allow admins to invite users", async () => {
      const admin = await createTestUser({ email: "admin@example.com" });
      const newUser = await createTestUser({ email: "newuser@example.com" });
      const org = await createTestOrganization(admin.id);

      const session = createMockSession(admin);
      const caller = organizationRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.inviteUser({
        organizationId: org.id,
        email: newUser.email!,
        role: "MEMBER",
      });

      expect(result.userId).toBe(newUser.id);
      expect(result.organizationId).toBe(org.id);
      expect(result.role).toBe("MEMBER");
    });

    it("should allow admins to invite users as admin", async () => {
      const admin = await createTestUser({ email: "admin@example.com" });
      const newUser = await createTestUser({ email: "newuser@example.com" });
      const org = await createTestOrganization(admin.id);

      const session = createMockSession(admin);
      const caller = organizationRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.inviteUser({
        organizationId: org.id,
        email: newUser.email!,
        role: "ADMIN",
      });

      expect(result.role).toBe("ADMIN");
    });

    it("should throw FORBIDDEN for non-admin members", async () => {
      const admin = await createTestUser({ email: "admin@example.com" });
      const member = await createTestUser({ email: "member@example.com" });
      const newUser = await createTestUser({ email: "newuser@example.com" });
      const org = await createTestOrganization(admin.id);

      await db.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: member.id,
          role: "MEMBER",
        },
      });

      const session = createMockSession(member);
      const caller = organizationRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.inviteUser({
          organizationId: org.id,
          email: newUser.email!,
          role: "MEMBER",
        }),
      ).rejects.toThrow("Only admins can invite users");
    });

    it("should throw NOT_FOUND if user email does not exist", async () => {
      const admin = await createTestUser({ email: "admin@example.com" });
      const org = await createTestOrganization(admin.id);

      const session = createMockSession(admin);
      const caller = organizationRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.inviteUser({
          organizationId: org.id,
          email: "nonexistent@example.com",
          role: "MEMBER",
        }),
      ).rejects.toThrow("User not found with this email");
    });

    it("should throw CONFLICT if user is already a member", async () => {
      const admin = await createTestUser({ email: "admin@example.com" });
      const member = await createTestUser({ email: "member@example.com" });
      const org = await createTestOrganization(admin.id);

      await db.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: member.id,
          role: "MEMBER",
        },
      });

      const session = createMockSession(admin);
      const caller = organizationRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.inviteUser({
          organizationId: org.id,
          email: member.email!,
          role: "MEMBER",
        }),
      ).rejects.toThrow("User is already a member of this organization");
    });
  });

  describe("listMembers", () => {
    it("should list all members for organization members", async () => {
      const admin = await createTestUser({ email: "admin@example.com" });
      const member = await createTestUser({ email: "member@example.com" });
      const org = await createTestOrganization(admin.id);

      await db.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: member.id,
          role: "MEMBER",
        },
      });

      const session = createMockSession(admin);
      const caller = organizationRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.listMembers({ organizationId: org.id });

      expect(result).toHaveLength(2);
      expect(result.map((m) => m.userId)).toContain(admin.id);
      expect(result.map((m) => m.userId)).toContain(member.id);
    });

    it("should throw FORBIDDEN for non-members", async () => {
      const user1 = await createTestUser({ email: "user1@example.com" });
      const user2 = await createTestUser({ email: "user2@example.com" });
      const org = await createTestOrganization(user1.id);

      const session = createMockSession(user2);
      const caller = organizationRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.listMembers({ organizationId: org.id }),
      ).rejects.toThrow("You are not a member of this organization");
    });
  });

  describe("removeMember", () => {
    it("should allow admins to remove members", async () => {
      const admin = await createTestUser({ email: "admin@example.com" });
      const member = await createTestUser({ email: "member@example.com" });
      const org = await createTestOrganization(admin.id);

      await db.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: member.id,
          role: "MEMBER",
        },
      });

      const session = createMockSession(admin);
      const caller = organizationRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      const result = await caller.removeMember({
        organizationId: org.id,
        userId: member.id,
      });

      expect(result.success).toBe(true);

      const membership = await db.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: org.id,
            userId: member.id,
          },
        },
      });

      expect(membership).toBeNull();
    });

    it("should throw FORBIDDEN for non-admin members", async () => {
      const admin = await createTestUser({ email: "admin@example.com" });
      const member1 = await createTestUser({ email: "member1@example.com" });
      const member2 = await createTestUser({ email: "member2@example.com" });
      const org = await createTestOrganization(admin.id);

      await db.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: member1.id,
          role: "MEMBER",
        },
      });

      await db.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: member2.id,
          role: "MEMBER",
        },
      });

      const session = createMockSession(member1);
      const caller = organizationRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.removeMember({
          organizationId: org.id,
          userId: member2.id,
        }),
      ).rejects.toThrow("Only admins can remove members");
    });

    it("should throw BAD_REQUEST when trying to remove self", async () => {
      const admin = await createTestUser({ email: "admin@example.com" });
      const org = await createTestOrganization(admin.id);

      const session = createMockSession(admin);
      const caller = organizationRouter.createCaller({
        db,
        session,
        headers: new Headers(),
      });

      await expect(
        caller.removeMember({
          organizationId: org.id,
          userId: admin.id,
        }),
      ).rejects.toThrow("You cannot remove yourself from the organization");
    });
  });
});
