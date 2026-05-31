import { crc32 } from "node:zlib";
import { deflateSync } from "node:zlib";

type Pixel = readonly [number, number, number, number];
type Canvas = Pixel[][];

type ScreenshotVariant = "dashboard" | "predict" | "wide";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const NAVY: Pixel = [6, 20, 46, 255];
const EMERALD: Pixel = [16, 185, 129, 255];
const EMERALD_DARK: Pixel = [5, 150, 105, 255];
const EMERALD_LIGHT: Pixel = [52, 211, 153, 255];
const GOLD: Pixel = [251, 191, 36, 255];
const WHITE: Pixel = [248, 250, 252, 255];
const SLATE: Pixel = [15, 23, 42, 255];
const INDIGO: Pixel = [79, 70, 229, 255];

function chunk(type: string, data: Buffer) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function writePng(width: number, height: number, pixels: Canvas) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  let offset = 0;

  for (let y = 0; y < height; y += 1) {
    raw[offset] = 0;
    offset += 1;

    for (let x = 0; x < width; x += 1) {
      const [red, green, blue, alpha] = pixels[y][x];
      raw[offset] = red;
      raw[offset + 1] = green;
      raw[offset + 2] = blue;
      raw[offset + 3] = alpha;
      offset += 4;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function gradient(width: number, height: number) {
  const rows: Canvas = [];
  const bottom: Pixel = [5, 150, 105, 255];

  for (let y = 0; y < height; y += 1) {
    const t = y / Math.max(1, height - 1);
    const row: Pixel[] = [];

    for (let x = 0; x < width; x += 1) {
      const radial = Math.max(0, 1 - Math.hypot(x / width - 0.5, y / height - 0.25) * 1.8);
      row.push([
        clamp(NAVY[0] * (1 - t) + bottom[0] * t + 35 * radial),
        clamp(NAVY[1] * (1 - t) + bottom[1] * t + 35 * radial),
        clamp(NAVY[2] * (1 - t) + bottom[2] * t + 35 * radial),
        255
      ]);
    }

    rows.push(row);
  }

  return rows;
}

function clamp(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function drawRect(canvas: Canvas, x0: number, y0: number, x1: number, y1: number, color: Pixel, radius = 0) {
  const height = canvas.length;
  const width = canvas[0].length;
  const left = Math.max(0, Math.floor(x0));
  const top = Math.max(0, Math.floor(y0));
  const right = Math.min(width, Math.floor(x1));
  const bottom = Math.min(height, Math.floor(y1));

  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      if (radius > 0) {
        const dx = Math.max(left + radius - x, 0, x - (right - radius - 1));
        const dy = Math.max(top + radius - y, 0, y - (bottom - radius - 1));
        if (dx * dx + dy * dy > radius * radius) continue;
      }

      canvas[y][x] = color;
    }
  }
}

function drawCircle(canvas: Canvas, cx: number, cy: number, radius: number, color: Pixel, outlineWidth = 0) {
  const height = canvas.length;
  const width = canvas[0].length;
  const outer = radius * radius;
  const inner = (radius - outlineWidth) * (radius - outlineWidth);

  for (let y = Math.max(0, Math.floor(cy - radius)); y < Math.min(height, Math.ceil(cy + radius)); y += 1) {
    for (let x = Math.max(0, Math.floor(cx - radius)); x < Math.min(width, Math.ceil(cx + radius)); x += 1) {
      const distance = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (distance <= outer && (outlineWidth === 0 || distance >= inner)) canvas[y][x] = color;
    }
  }
}

function drawPolygon(canvas: Canvas, points: Array<readonly [number, number]>, color: Pixel) {
  const height = canvas.length;
  const width = canvas[0].length;
  const yValues = points.map(([, y]) => y);

  for (let y = Math.max(0, Math.floor(Math.min(...yValues))); y <= Math.min(height - 1, Math.ceil(Math.max(...yValues))); y += 1) {
    const intersections: number[] = [];

    for (let index = 0; index < points.length; index += 1) {
      const [x1, y1] = points[index];
      const [x2, y2] = points[(index + 1) % points.length];
      if ((y1 <= y && y < y2) || (y2 <= y && y < y1)) intersections.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
    }

    intersections.sort((a, b) => a - b);
    for (let index = 0; index < intersections.length; index += 2) {
      for (let x = Math.max(0, Math.floor(intersections[index])); x <= Math.min(width - 1, Math.ceil(intersections[index + 1])); x += 1) {
        canvas[y][x] = color;
      }
    }
  }
}

function drawTrophy(canvas: Canvas, scale: number, offsetX: number, offsetY: number) {
  drawRect(canvas, offsetX + 18 * scale, offsetY + 32 * scale, offsetX + 26 * scale, offsetY + 60 * scale, EMERALD_DARK, 4 * scale);
  drawRect(canvas, offsetX + 74 * scale, offsetY + 32 * scale, offsetX + 82 * scale, offsetY + 60 * scale, EMERALD_DARK, 4 * scale);

  for (let y = Math.floor(offsetY + 18 * scale); y < Math.floor(offsetY + 62 * scale); y += 1) {
    const t = (y - (offsetY + 18 * scale)) / (44 * scale);
    drawRect(canvas, offsetX + (30 + 8 * t) * scale, y, offsetX + (70 - 8 * t) * scale, y + 1, EMERALD);
  }

  drawRect(canvas, offsetX + 45 * scale, offsetY + 62 * scale, offsetX + 55 * scale, offsetY + 78 * scale, EMERALD);
  drawRect(canvas, offsetX + 32 * scale, offsetY + 78 * scale, offsetX + 68 * scale, offsetY + 88 * scale, EMERALD, 3 * scale);

  const centerX = offsetX + 50 * scale;
  const centerY = offsetY + 7 * scale;
  const points = [-90, -45, 0, 45, 90, 135, 180, 225].map((angle, index) => {
    const radius = (index % 2 === 0 ? 10 : 4) * scale;
    const radians = (angle * Math.PI) / 180;
    return [centerX + Math.cos(radians) * radius, centerY + Math.sin(radians) * radius] as const;
  });
  drawPolygon(canvas, points, GOLD);
}

export function createIconPng(size: 192 | 512) {
  const canvas = gradient(size, size);
  drawCircle(canvas, size / 2, size / 2, size * 0.43, EMERALD_LIGHT, Math.max(2, size * 0.025));
  drawTrophy(canvas, size / 100, 0, 6 * size / 100);
  return writePng(size, size, canvas);
}

export function createScreenshotPng(variant: ScreenshotVariant) {
  const isWide = variant === "wide";
  const width = isWide ? 1280 : 540;
  const height = 720;
  const canvas = gradient(width, height);
  const margin = width * 0.07;

  drawRect(canvas, margin, height * 0.08, width - margin, height * 0.24, [255, 255, 255, 38], width * 0.035);
  drawCircle(canvas, margin + 45, height * 0.16, 36, EMERALD);
  drawTrophy(canvas, 0.55, margin + 18, height * 0.105);

  for (let index = 0; index < 3; index += 1) {
    const y = height * 0.31 + index * height * 0.16;
    drawRect(canvas, margin, y, width - margin, y + height * 0.11, WHITE, width * 0.025);
    drawRect(canvas, margin + 24, y + 22, margin + width * 0.42, y + 36, SLATE, 4);
    drawRect(canvas, margin + 24, y + 52, margin + width * (index % 2 === 0 ? 0.66 : 0.54), y + 64, EMERALD, 4);
    drawRect(canvas, width - margin - 95, y + 28, width - margin - 25, y + 72, EMERALD_DARK, 12);
  }

  drawRect(canvas, margin, height * 0.78, width - margin, height * 0.89, variant === "predict" ? INDIGO : EMERALD, width * 0.025);

  return writePng(width, height, canvas);
}
