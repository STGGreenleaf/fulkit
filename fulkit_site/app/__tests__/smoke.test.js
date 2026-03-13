import { describe, it, expect, beforeEach } from "vitest";
import { mockRequest, authedRequest, setMockUser, clearMockUser, mockAdmin } from "./setup.js";

// ─── BYOK Route ───

describe("api/byok", () => {
  beforeEach(() => clearMockUser());

  it("GET rejects unauthenticated requests", async () => {
    const { GET } = await import("../app/api/byok/route.js");
    const req = mockRequest("GET", "http://localhost:3000/api/byok");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("GET returns connected: false for user with no BYOK key", async () => {
    setMockUser({ id: "user-1", email: "test@test.com" });
    const { GET } = await import("../app/api/byok/route.js");
    const req = authedRequest("GET", "http://localhost:3000/api/byok");
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.connected).toBe(false);
  });

  it("POST rejects unauthenticated requests", async () => {
    const { POST } = await import("../app/api/byok/route.js");
    const req = mockRequest("POST", "http://localhost:3000/api/byok", {
      body: { key: "sk-test-123" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("POST rejects invalid key format", async () => {
    setMockUser({ id: "user-1", email: "test@test.com" });
    const { POST } = await import("../app/api/byok/route.js");
    const req = authedRequest("POST", "http://localhost:3000/api/byok", {
      body: { key: "not-a-valid-key" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid/i);
  });

  it("DELETE rejects unauthenticated requests", async () => {
    const { DELETE } = await import("../app/api/byok/route.js");
    const req = mockRequest("DELETE", "http://localhost:3000/api/byok");
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });
});

// ─── Notes Import Route ───

describe("api/notes/import", () => {
  beforeEach(() => clearMockUser());

  it("rejects unauthenticated requests", async () => {
    const { POST } = await import("../app/api/notes/import/route.js");
    const req = mockRequest("POST", "http://localhost:3000/api/notes/import", {
      body: { notes: [{ title: "test", content: "test" }] },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("rejects non-owner users", async () => {
    setMockUser({ id: "user-1", email: "test@test.com" });
    // Mock profile query returning non-owner role
    mockAdmin.from.mockImplementation(() => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        single: () => Promise.resolve({ data: { role: "user" }, error: null }),
      };
      return chain;
    });
    const { POST } = await import("../app/api/notes/import/route.js");
    const req = authedRequest("POST", "http://localhost:3000/api/notes/import", {
      body: { notes: [{ title: "test", content: "test" }] },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});

// ─── Whispers Route ───

describe("api/whispers", () => {
  beforeEach(() => clearMockUser());

  it("rejects unauthenticated requests", async () => {
    const { GET } = await import("../app/api/whispers/route.js");
    const req = mockRequest("GET", "http://localhost:3000/api/whispers");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

// ─── Chat Route ───

describe("api/chat", () => {
  beforeEach(() => clearMockUser());

  it("rejects unauthenticated requests in production", async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    // Re-import to get fresh module
    const { POST } = await import("../app/api/chat/route.js");
    const req = mockRequest("POST", "http://localhost:3000/api/chat", {
      body: { messages: [{ role: "user", content: "hello" }] },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    process.env.NODE_ENV = origEnv;
  });

  it("rejects empty messages", async () => {
    setMockUser({ id: "user-1", email: "test@test.com" });
    const { POST } = await import("../app/api/chat/route.js");
    const req = authedRequest("POST", "http://localhost:3000/api/chat", {
      body: { messages: [] },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects messages with empty content", async () => {
    setMockUser({ id: "user-1", email: "test@test.com" });
    const { POST } = await import("../app/api/chat/route.js");
    const req = authedRequest("POST", "http://localhost:3000/api/chat", {
      body: { messages: [{ role: "user", content: "" }] },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
