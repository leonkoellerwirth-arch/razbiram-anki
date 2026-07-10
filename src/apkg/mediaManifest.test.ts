import { describe, expect, it } from "vitest";
import { decodeMediaManifest } from "./mediaManifest";

// Minimal protobuf encoders — enough to forge a `MediaEntries` message the way
// modern Anki writes one, so we can assert the decoder reads it back.
function tag(field: number, wire: number): number[] {
  return [(field << 3) | wire];
}
function lenDelimited(field: number, payload: number[]): number[] {
  return [...tag(field, 2), payload.length, ...payload];
}
function str(field: number, value: string): number[] {
  return lenDelimited(field, [...new TextEncoder().encode(value)]);
}
/** MediaEntry { name = 1; size = 2 } wrapped as entries (field 1) of MediaEntries. */
function entry(name: string): number[] {
  const inner = [...str(1, name), ...tag(2, 0), 42];
  return lenDelimited(1, inner);
}

describe("decodeMediaManifest", () => {
  it("reads the legacy JSON map", () => {
    const bytes = new TextEncoder().encode(JSON.stringify({ "0": "cat.jpg", "1": "dog.png" }));
    const map = decodeMediaManifest(bytes);
    expect(map.get("0")).toBe("cat.jpg");
    expect(map.get("1")).toBe("dog.png");
  });

  it("treats an empty manifest as no media", () => {
    expect(decodeMediaManifest(new Uint8Array()).size).toBe(0);
  });

  it("reads the modern protobuf MediaEntries, positional by index", () => {
    const bytes = new Uint8Array([...entry("areolar.png"), ...entry("bone.jpg")]);
    const map = decodeMediaManifest(bytes);
    expect(map.size).toBe(2);
    expect(map.get("0")).toBe("areolar.png");
    expect(map.get("1")).toBe("bone.jpg");
  });

  it("keeps unicode filenames intact", () => {
    const bytes = new Uint8Array(entry("Größe-Ü.jpg"));
    expect(decodeMediaManifest(bytes).get("0")).toBe("Größe-Ü.jpg");
  });
});
