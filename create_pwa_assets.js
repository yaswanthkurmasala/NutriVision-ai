const fs = require('fs');
const path = require('path');
const { createCanvas } = (() => {
  try { return require('canvas'); } catch (e) { return { createCanvas: null }; }
})();

// Pure JS PNG encoder if canvas is not installed
function createBasicPngBuffer(width, height, r = 19, g = 236, b = 55) {
  const zlib = require('zlib');
  
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // color type (RGBA)
  ihdr.writeUInt8(0, 10); // compression method
  ihdr.writeUInt8(0, 11); // filter method
  ihdr.writeUInt8(0, 12); // interlace method
  
  const ihdrChunk = createChunk('IHDR', ihdr);
  
  // IDAT raw scanlines
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(height * rowSize);
  
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      // Draw dark background with green icon circle in center
      const dx = x - width / 2;
      const dy = y - height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const isCircle = dist < (Math.min(width, height) * 0.35);
      const isInner = dist < (Math.min(width, height) * 0.22);
      
      if (isInner) {
        rawData[pxOffset] = 12; // Dark center
        rawData[pxOffset + 1] = 26;
        rawData[pxOffset + 2] = 14;
        rawData[pxOffset + 3] = 255;
      } else if (isCircle) {
        rawData[pxOffset] = r; // Bright primary green ring
        rawData[pxOffset + 1] = g;
        rawData[pxOffset + 2] = b;
        rawData[pxOffset + 3] = 255;
      } else {
        rawData[pxOffset] = 12; // #0c1a0e background
        rawData[pxOffset + 1] = 26;
        rawData[pxOffset + 2] = 14;
        rawData[pxOffset + 3] = 255;
      }
    }
  }
  
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4);
  data.copy(buf, 8);
  
  const crc = crc32(buf.slice(4, 8 + len));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

fs.writeFileSync(path.join(publicDir, 'icon-192.png'), createBasicPngBuffer(192, 192));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), createBasicPngBuffer(512, 512));
fs.writeFileSync(path.join(publicDir, 'maskable-icon-512.png'), createBasicPngBuffer(512, 512));
fs.writeFileSync(path.join(publicDir, 'screenshot-1.png'), createBasicPngBuffer(1080, 1920));
fs.writeFileSync(path.join(publicDir, 'screenshot-2.png'), createBasicPngBuffer(1080, 1920));

console.log("PWA icons and screenshots generated successfully!");
