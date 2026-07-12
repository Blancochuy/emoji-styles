import sharp from "sharp";
import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { detectImageFormat, optimizeImage } from "../image-optimizer";

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array = new Uint8Array()): Buffer {
  const body = Buffer.from(data);
  const chunk = Buffer.alloc(12 + body.length);
  chunk.writeUInt32BE(body.length, 0);
  chunk.write(type, 4, 4, "ascii");
  body.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, 8 + body.length)), 8 + body.length);
  return chunk;
}

function createApngFixture(): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const animationControl = Buffer.alloc(8);
  animationControl.writeUInt32BE(2, 0);
  const frameControl = (sequence: number, delay: number) => {
    const data = Buffer.alloc(26);
    data.writeUInt32BE(sequence, 0);
    data.writeUInt32BE(1, 4);
    data.writeUInt32BE(1, 8);
    data.writeUInt16BE(delay, 20);
    data.writeUInt16BE(1000, 22);
    return data;
  };
  const firstFrame = deflateSync(Buffer.from([0, 239, 68, 68, 255]));
  const secondFrameData = deflateSync(Buffer.from([0, 20, 184, 166, 255]));
  const secondFrame = Buffer.alloc(4 + secondFrameData.length);
  secondFrame.writeUInt32BE(2, 0);
  secondFrameData.copy(secondFrame, 4);
  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("acTL", animationControl),
    pngChunk("fcTL", frameControl(0, 80)),
    pngChunk("IDAT", firstFrame),
    pngChunk("fcTL", frameControl(1, 140)),
    pngChunk("fdAT", secondFrame),
    pngChunk("IEND"),
  ]);
}

describe("image optimizer", () => {
  it("detects APNG from its animation control chunk", () => {
    const apng = createApngFixture();
    expect(detectImageFormat(apng)).toBe("apng");
  });

  it("preserves APNG byte-for-byte", async () => {
    const apng = createApngFixture();
    const result = await optimizeImage(apng);
    const metadata = await sharp(apng).metadata();
    expect(result.optimized).toBe(false);
    expect(result.animated).toBe(true);
    expect(result.data.equals(apng)).toBe(true);
    expect(metadata.width).toBe(1);
    expect(metadata.height).toBe(1);
  });

  it("keeps static PNG pixels identical after lossless optimization", async () => {
    const source = await sharp({
      create: { width: 12, height: 12, channels: 4, background: "#14b8a6" },
    }).png({ compressionLevel: 0 }).toBuffer();
    const result = await optimizeImage(source);
    const before = await sharp(source).raw().toBuffer();
    const after = await sharp(result.data).raw().toBuffer();

    expect(result.sourceFormat).toBe("png");
    expect(result.outputFormat).toBe("png");
    expect(after.equals(before)).toBe(true);
    expect(result.outputBytes).toBeLessThanOrEqual(result.sourceBytes);
  });

  it("preserves animation timing and looping when optimizing GIF", async () => {
    const redFrame = await sharp({
      create: { width: 3, height: 3, channels: 4, background: "#ef4444" },
    }).png().toBuffer();
    const tealFrame = await sharp({
      create: { width: 3, height: 3, channels: 4, background: "#14b8a6" },
    }).png().toBuffer();

    const source = await sharp([redFrame, tealFrame], { join: { animated: true } })
      .gif({ delay: [70, 130], loop: 2 })
      .toBuffer();
    const result = await optimizeImage(source);

    expect(result.sourceFormat).toBe("gif");
    expect(result.animated).toBe(true);
    expect(result.frames).toBe(2);
    expect(result.delays).toEqual([70, 130]);
    expect(result.loop).toBe(2);

    const outputMetadata = await sharp(result.data, { animated: true }).metadata();
    expect(outputMetadata.pages).toBe(2);
    expect(outputMetadata.delay).toEqual([70, 130]);
    expect(outputMetadata.loop).toBe(2);
  });

  it("preserves animated WebP timing and looping", async () => {
    const first = await sharp({
      create: { width: 3, height: 3, channels: 4, background: "#0f766e" },
    }).png().toBuffer();
    const second = await sharp({
      create: { width: 3, height: 3, channels: 4, background: "#f59e0b" },
    }).png().toBuffer();
    const source = await sharp([first, second], { join: { animated: true } })
      .webp({ lossless: true, delay: [90, 150], loop: 3 })
      .toBuffer();

    const result = await optimizeImage(source);
    const outputMetadata = await sharp(result.data, { animated: true }).metadata();
    expect(result.sourceFormat).toBe("webp");
    expect(result.frames).toBe(2);
    expect(outputMetadata.pages).toBe(2);
    expect(outputMetadata.delay).toEqual([90, 150]);
    expect(outputMetadata.loop).toBe(3);
  });

  it("leaves unknown files unchanged", async () => {
    const source = Buffer.from("not-an-image");
    const result = await optimizeImage(source);
    expect(result.outputFormat).toBe("unknown");
    expect(result.data.equals(source)).toBe(true);
  });
});
