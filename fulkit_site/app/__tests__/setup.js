import { vi } from "vitest";

// Mock Supabase admin client
const mockSupabaseChain = () => {
  const chain = {
    select: vi.fn().mockReturnValue(chain),
    insert: vi.fn().mockReturnValue(chain),
    update: vi.fn().mockReturnValue(chain),
    upsert: vi.fn().mockReturnValue(chain),
    delete: vi.fn().mockReturnValue(chain),
    eq: vi.fn().mockReturnValue(chain),
    like: vi.fn().mockReturnValue(chain),
    single: vi.fn().mockReturnValue(chain),
    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    order: vi.fn().mockReturnValue(chain),
    limit: vi.fn().mockReturnValue(chain),
    abortSignal: vi.fn().mockReturnValue(chain),
    data: null,
    error: null,
    then: (cb) => cb({ data: null, error: null }),
  };
  return chain;
};

const mockAdmin = {
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: "Invalid token" } }),
  },
  from: vi.fn(() => mockSupabaseChain()),
};

vi.mock("../lib/supabase-server", () => ({
  getSupabaseAdmin: () => mockAdmin,
}));

// Mock Anthropic SDK
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      constructor() {
        this.messages = {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "text", text: "mock response" }],
            stop_reason: "end_turn",
          }),
          stream: vi.fn().mockReturnValue({
            on: vi.fn().mockReturnThis(),
            finalMessage: vi.fn().mockResolvedValue({
              content: [{ type: "text", text: "mock" }],
              stop_reason: "end_turn",
            }),
          }),
        };
      }
    },
  };
});

// Mock integration modules (they import at module level)
vi.mock("../lib/github", () => ({
  getGitHubToken: vi.fn().mockResolvedValue(null),
  githubFetch: vi.fn(),
  authenticateUser: vi.fn().mockResolvedValue(null),
}));

vi.mock("../lib/numbrly", () => ({
  getNumbrlyToken: vi.fn().mockResolvedValue(null),
  numbrlyFetch: vi.fn(),
}));

vi.mock("../lib/truegauge", () => ({
  getTrueGaugeToken: vi.fn().mockResolvedValue(null),
  truegaugeFetch: vi.fn(),
}));

vi.mock("../lib/square-server", () => ({
  getSquareToken: vi.fn().mockResolvedValue(null),
  squareFetch: vi.fn(),
}));

vi.mock("../lib/shopify-server", () => ({
  getShopifyToken: vi.fn().mockResolvedValue(null),
  shopifyFetch: vi.fn(),
}));

vi.mock("../lib/stripe-server", () => ({
  getStripeToken: vi.fn().mockResolvedValue(null),
  stripeFetch: vi.fn(),
}));

vi.mock("../lib/toast-server", () => ({
  getToastToken: vi.fn().mockResolvedValue(null),
  toastFetch: vi.fn(),
}));

// Helper: create a mock Request
export function mockRequest(method, url, { headers = {}, body = null } = {}) {
  const init = { method, headers: new Headers(headers) };
  if (body && method !== "GET") {
    init.body = JSON.stringify(body);
    init.headers.set("Content-Type", "application/json");
  }
  return new Request(url || "http://localhost:3000/api/test", init);
}

// Helper: create an authed mock Request
export function authedRequest(method, url, { body = null, token = "valid-token" } = {}) {
  return mockRequest(method, url, {
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
}

// Helper: set mock auth user
export function setMockUser(user) {
  mockAdmin.auth.getUser.mockResolvedValue({
    data: { user },
    error: null,
  });
}

// Helper: clear mock auth
export function clearMockUser() {
  mockAdmin.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: { message: "Invalid token" },
  });
}

export { mockAdmin };
