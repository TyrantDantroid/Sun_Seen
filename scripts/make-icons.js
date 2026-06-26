import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const sizes = [192, 512];

for (const size of sizes) {
  writeFileSync(`assets/icon-${size}.png`, createPng(size));
}

function createPng(size) {
  const width = size;
  const height = size;
  const pixels = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const inside = roundedRect(x, y, width, height, size * 0.19);
      const sky = mix([223, 243, 255], [255, 241, 212], y / height);
      const hill = y > height * 0.64 + Math.sin((x / width) * Math.PI * 1.2) * height * 0.08;
      const ridge = y > height * 0.7 - Math.sin((x / width) * Math.PI * 1.7) * height * 0.07;
      const sun = circle(x, y, width * 0.52, height * 0.41, width * 0.2);
      const glow = circle(x, y, width * 0.52, height * 0.41, width * 0.29);

      let color = sky;
      if (glow) color = mix(color, [246, 181, 68], 0.28);
      if (sun) color = mix([246, 181, 68], [255, 248, 189], highlightAmount(x, y, width, height));
      if (hill) color = [76, 143, 114];
      if (ridge) color = mix(color, [37, 50, 74], 0.22);

      pixels[i] = color[0];
      pixels[i + 1] = color[1];
      pixels[i + 2] = color[2];
      pixels[i + 3] = inside ? 255 : 0;
    }
  }

  const scanlines = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    scanlines[rowStart] = 0;
    pixels.copy(scanlines, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", Buffer.concat([uint32(width), uint32(height), Buffer.from([8, 6, 0, 0, 0])])),
    chunk("IDAT", deflateSync(scanlines)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  return Buffer.concat([uint32(data.length), typeBuffer, data, uint32(crc32(Buffer.concat([typeBuffer, data])))]);
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function roundedRect(x, y, width, height, radius) {
  const cx = x < radius ? radius : x > width - radius ? width - radius : x;
  const cy = y < radius ? radius : y > height - radius ? height - radius : y;
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

function circle(x, y, cx, cy, radius) {
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

function mix(a, b, amount) {
  return a.map((value, index) => Math.round(value * (1 - amount) + b[index] * amount));
}

function highlightAmount(x, y, width, height) {
  const distance = Math.hypot(x - width * 0.45, y - height * 0.34) / (width * 0.2);
  return Math.max(0, 1 - distance) * 0.9;
}
