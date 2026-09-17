import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FOODS } from "./fixtures";

vi.mock("../lib/db", () => ({
  prisma: { food: { findMany: vi.fn(async () => FOODS) } },
}));

import { AnthropicProvider, LocalProvider } from "../lib/ai/provider";
import { invalidateFoodCache } from "../lib/resolver";

type FetchMock = ReturnType<typeof vi.fn>;

function mockFetch(impl: () => Promise<unknown>): FetchMock {
  const fn = vi.fn(impl);
  vi.stubGlobal("fetch", fn);
  return fn;
}

// A successful Anthropic-shaped response whose first content block is `text`.
function okResponse(text: string) {
  return async () => ({ ok: true, json: async () => ({ content: [{ type: "text", text }] }) });
}

beforeEach(() => {
  invalidateFoodCache();
  process.env.ANTHROPIC_API_KEY = "test-key";
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.ANTHROPIC_API_KEY;
});

describe("LocalProvider (offline fallback)", () => {
  it("cannot see images: detections come only from keywords in the hint/filename", async () => {
    const local = new LocalProvider();
    expect(await local.analyzeMealImage("base64", "image/jpeg", "IMG_20260813.jpg")).toEqual([]);
    const hinted = await local.analyzeMealImage("base64", "image/jpeg", "chicken-rice.jpg");
    expect(hinted.map((d) => d.label)).toEqual(["Chicken breast (cooked)", "White rice (cooked)"]);
    expect(hinted.every((d) => d.confidence === 0.6)).toBe(true);
  });

  it("never produces a narrative (caller uses the template)", async () => {
    expect(await new LocalProvider().generateWeeklyNarrative({})).toBeNull();
  });
});

describe("AnthropicProvider.analyzeMealImage — fallback behaviour", () => {
  const local = new LocalProvider();

  it("falls back to LocalProvider when fetch rejects (network error)", async () => {
    const fetchMock = mockFetch(() => Promise.reject(new Error("ECONNRESET")));
    const result = await new AnthropicProvider().analyzeMealImage("b64", "image/jpeg", "chicken rice");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual(await local.analyzeMealImage("b64", "image/jpeg", "chicken rice"));
  });

  it("falls back to LocalProvider on a non-2xx response", async () => {
    mockFetch(async () => ({ ok: false, status: 529, json: async () => ({ error: "overloaded" }) }));
    const result = await new AnthropicProvider().analyzeMealImage("b64", "image/jpeg", "banana");
    expect(result).toEqual(await local.analyzeMealImage("b64", "image/jpeg", "banana"));
  });

  it("falls back to LocalProvider when the model returns malformed JSON", async () => {
    mockFetch(okResponse("Sure! Here is the analysis: [{label: chicken, grams: oops"));
    const result = await new AnthropicProvider().analyzeMealImage("b64", "image/jpeg", "banana");
    expect(result).toEqual(await local.analyzeMealImage("b64", "image/jpeg", "banana"));
  });

  it("parses a well-formed reply, drops zero-gram entries and clamps confidence to [0,1]", async () => {
    mockFetch(
      okResponse('Here you go: [{"label":"chicken breast","grams":150,"confidence":0.9},{"label":"rice","grams":0,"confidence":0.9},{"label":"broccoli","grams":80,"confidence":1.7}] done')
    );
    const result = await new AnthropicProvider().analyzeMealImage("b64", "image/jpeg");
    expect(result).toEqual([
      { label: "chicken breast", grams: 150, confidence: 0.9 },
      { label: "broccoli", grams: 80, confidence: 1 },
    ]);
  });

  it("sends the image and the vision model id, never a request for calories", async () => {
    const fetchMock = mockFetch(okResponse("[]"));
    await new AnthropicProvider().analyzeMealImage("IMAGEDATA", "image/png");
    const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    expect(body.model).toBe("claude-sonnet-5");
    expect(body.messages[0].content[0]).toEqual({ type: "image", source: { type: "base64", media_type: "image/png", data: "IMAGEDATA" } });
    expect(body.messages[0].content[1].text).toContain("Do not estimate calories");
  });
});

describe("AnthropicProvider.parseFoodText — deterministic first, model only for leftovers", () => {
  it("does not call the model at all when the deterministic parser matched everything", async () => {
    const fetchMock = mockFetch(okResponse("[]"));
    const result = await new AnthropicProvider().parseFoodText("two eggs and a banana");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.items.map((i) => i.label)).toEqual(["Egg", "Banana"]);
    expect(result.unmatched).toEqual([]);
  });

  it("keeps the deterministic result intact when the normalization call fails", async () => {
    mockFetch(() => Promise.reject(new Error("timeout")));
    const result = await new AnthropicProvider().parseFoodText("moon dust and a banana");
    expect(result.items.map((i) => i.label)).toEqual(["Banana"]);
    expect(result.unmatched).toEqual(["moon dust"]);
  });

  it("keeps the deterministic result when the normalization reply is malformed", async () => {
    mockFetch(okResponse("not json at all"));
    const result = await new AnthropicProvider().parseFoodText("moon dust and a banana");
    expect(result.unmatched).toEqual(["moon dust"]);
  });

  it("resolves normalized leftovers through the database, capped at 0.7 confidence", async () => {
    const fetchMock = mockFetch(okResponse('[{"phrase":"moon dust","label":"chicken breast","grams":120}]'));
    const result = await new AnthropicProvider().parseFoodText("moon dust and a banana");
    const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    expect(body.model).toBe("claude-haiku-4-5-20251001");
    expect(result.unmatched).toEqual([]);
    const added = result.items.find((i) => i.label === "Chicken breast (cooked)");
    expect(added).toMatchObject({ grams: 120, kcal: 198, confidence: 0.7 }); // nutrition from DB, not the model
  });
});

describe("AnthropicProvider.generateWeeklyNarrative", () => {
  it("returns null on failure so the caller falls back to the template narrative", async () => {
    mockFetch(() => Promise.reject(new Error("boom")));
    expect(await new AnthropicProvider().generateWeeklyNarrative({ daysLogged: 3 })).toBeNull();
  });

  it("uses the frontier model id and returns the text", async () => {
    const fetchMock = mockFetch(okResponse("A solid week."));
    expect(await new AnthropicProvider().generateWeeklyNarrative({ daysLogged: 3 })).toBe("A solid week.");
    expect(JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body).model).toBe("claude-fable-5");
  });
});

describe("getAI — provider selection", () => {
  it("picks LocalProvider without a key and AnthropicProvider with one", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    vi.resetModules();
    let mod = await import("../lib/ai/provider");
    expect(mod.getAI().name).toBe("local");

    process.env.ANTHROPIC_API_KEY = "test-key";
    vi.resetModules();
    mod = await import("../lib/ai/provider");
    expect(mod.getAI().name).toBe("anthropic");
  });
});
