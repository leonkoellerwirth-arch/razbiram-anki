import { decompress } from "fzstd";

/** Decode a `.apkg` `media` manifest into an index→filename map. Anki has three
 *  layouts and a modern export mixes them:
 *   - legacy (`collection.anki2` / `.anki21`): plain JSON `{"0":"cat.jpg"}`
 *   - modern (`collection.anki21b`): the file is **zstd-compressed protobuf**
 *     (`MediaEntries { repeated MediaEntry entries = 1 }`, `MediaEntry.name = 1`),
 *     entries positional — the i-th entry names the archive member `"i"`.
 *  Reading it as JSON (the old code) crashed on the zstd magic bytes. */
export function decodeMediaManifest(raw: Uint8Array): Map<string, string> {
  let bytes = raw;
  if (startsWith(bytes, ZSTD_MAGIC)) bytes = decompress(bytes);
  if (bytes.length === 0) return new Map();
  if (bytes[0] === 0x7b /* "{" */) return fromJson(bytes);
  return fromProtobuf(bytes);
}

const ZSTD_MAGIC = [0x28, 0xb5, 0x2f, 0xfd];

function startsWith(bytes: Uint8Array, magic: number[]): boolean {
  if (bytes.length < magic.length) return false;
  return magic.every((b, i) => bytes[i] === b);
}

function fromJson(bytes: Uint8Array): Map<string, string> {
  const map = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, string>;
  return new Map(Object.entries(map));
}

/** Parse the protobuf `MediaEntries`, taking each entry's `name` (field 1) in
 *  order; the ordinal position is the archive member name. */
function fromProtobuf(bytes: Uint8Array): Map<string, string> {
  const decoder = new TextDecoder();
  const map = new Map<string, string>();
  let i = 0;
  let index = 0;
  while (i < bytes.length) {
    const [tag, afterTag] = readVarint(bytes, i);
    i = afterTag;
    const field = tag >>> 3;
    const wire = tag & 0x7;
    if (field === 1 && wire === 2) {
      const [len, afterLen] = readVarint(bytes, i);
      const sub = bytes.subarray(afterLen, afterLen + len);
      i = afterLen + len;
      const name = readEntryName(sub, decoder);
      if (name !== null) map.set(String(index), name);
      index++;
    } else {
      i = skipField(bytes, i, wire);
    }
  }
  return map;
}

/** A `MediaEntry` submessage → its `name` string (field 1), ignoring size/sha1. */
function readEntryName(sub: Uint8Array, decoder: TextDecoder): string | null {
  let i = 0;
  while (i < sub.length) {
    const [tag, afterTag] = readVarint(sub, i);
    i = afterTag;
    const field = tag >>> 3;
    const wire = tag & 0x7;
    if (field === 1 && wire === 2) {
      const [len, afterLen] = readVarint(sub, i);
      return decoder.decode(sub.subarray(afterLen, afterLen + len));
    }
    i = skipField(sub, i, wire);
  }
  return null;
}

/** Advance past one field of the given wire type. */
function skipField(bytes: Uint8Array, i: number, wire: number): number {
  switch (wire) {
    case 0:
      return readVarint(bytes, i)[1]; // varint
    case 1:
      return i + 8; // 64-bit
    case 2: {
      const [len, afterLen] = readVarint(bytes, i);
      return afterLen + len; // length-delimited
    }
    case 5:
      return i + 4; // 32-bit
    default:
      return bytes.length; // unknown → stop
  }
}

/** Base-128 varint. Manifest tags/lengths stay well within the safe integer range. */
function readVarint(bytes: Uint8Array, i: number): [value: number, next: number] {
  let value = 0;
  let shift = 0;
  while (i < bytes.length) {
    const byte = bytes[i++];
    value += (byte & 0x7f) * 2 ** shift;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }
  return [value, i];
}
