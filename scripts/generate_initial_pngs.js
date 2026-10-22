const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// CRC32 implementation
function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const combined = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([lenBuf, combined, crcBuf]);
}

function createStyledPng(width, height, color1, color2, iconType, title) {
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter: None
    const t = y / height;
    // Gradient calculation
    const r = Math.round(color1[0] * (1 - t) + color2[0] * t);
    const g = Math.round(color1[1] * (1 - t) + color2[1] * t);
    const b = Math.round(color1[2] * (1 - t) + color2[2] * t);

    for (let x = 0; x < width; x++) {
      let pr = r, pg = g, pb = b, pa = 255;

      // Soft rounded card background with subtle inner vignette
      const dx = (x - width / 2) / (width / 2);
      const dy = (y - height / 2) / (height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Book spine / geometry motif
      if (iconType === 'book') {
        // Draw an open book or hardcover rectangle
        if (x >= 45 && x <= 210 && y >= 35 && y <= 220) {
          // Hardcover book surface
          pr = Math.min(255, r + 45);
          pg = Math.min(255, g + 45);
          pb = Math.min(255, b + 45);

          // Golden/White spine on left
          if (x >= 45 && x <= 65) {
            pr = 245; pg = 195; pb = 65;
          }
          // Embossed ribbon marker
          if (x >= 120 && x <= 130 && y >= 30 && y <= 235) {
            pr = 220; pg = 38; pb = 38;
          }
          // Subtle page border
          if ((x === 45 || x === 210 || y === 35 || y === 220)) {
            pr = 255; pg = 255; pb = 255;
          }
        }
      } else if (iconType === 'notebook') {
        // Spiral notebook
        if (x >= 50 && x <= 205 && y >= 30 && y <= 225) {
          pr = Math.min(255, r + 35);
          pg = Math.min(255, g + 35);
          pb = Math.min(255, b + 35);

          // Spiral rings on left
          if (x >= 40 && x <= 55 && (y % 18 < 8)) {
            pr = 220; pg = 225; pb = 230;
          }
          // Horizontal ruled lines
          if (y >= 70 && y <= 210 && (y % 20 === 0) && x > 65 && x < 195) {
            pr = Math.max(0, r - 30);
            pg = Math.max(0, g - 30);
            pb = Math.max(0, b - 30);
          }
        }
      } else if (iconType === 'pen') {
        // Pen / Fountain pen motif diagonally
        const lineDist = Math.abs(x - y);
        if (lineDist < 16 && x > 40 && x < 215) {
          pr = 240; pg = 240; pb = 245; // silver body
          if (lineDist < 6) {
            pr = Math.min(255, r + 70);
            pg = Math.min(255, g + 70);
            pb = Math.min(255, b + 70);
          }
          // Gold nib at bottom right
          if (x > 185 && x < 215) {
            pr = 234; pg = 179; pb = 8;
          }
        }
      } else if (iconType === 'art') {
        // Watercolor palette / color circles
        const circles = [
          { cx: 80, cy: 90, col: [239, 68, 68] },
          { cx: 130, cy: 80, col: [249, 115, 22] },
          { cx: 175, cy: 100, col: [234, 179, 8] },
          { cx: 90, cy: 155, col: [34, 197, 94] },
          { cx: 140, cy: 165, col: [59, 130, 246] },
          { cx: 175, cy: 150, col: [168, 85, 247] }
        ];
        // Wooden palette back
        if (x >= 45 && x <= 210 && y >= 50 && y <= 200) {
          pr = 250; pg = 245; pb = 235;
          for (const c of circles) {
            const cdist = Math.sqrt((x - c.cx) ** 2 + (y - c.cy) ** 2);
            if (cdist < 18) {
              pr = c.col[0]; pg = c.col[1]; pb = c.col[2];
            }
          }
        }
      } else if (iconType === 'math') {
        // Calculator / ruler
        if (x >= 65 && x <= 190 && y >= 35 && y <= 220) {
          pr = 30; pg = 41; pb = 59; // Dark calculator body
          // Screen
          if (x >= 80 && x <= 175 && y >= 50 && y <= 90) {
            pr = 167; pg = 243; pb = 208; // LCD green
          }
          // Keys grid
          if (y > 105 && y < 205 && x > 75 && x < 180) {
            if ((x % 24 < 18) && (y % 22 < 16)) {
              pr = 71; pg = 85; pb = 105;
            }
          }
        }
      }

      // Outer border highlight
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        pr = Math.min(255, pr + 40);
        pg = Math.min(255, pg + 40);
        pb = Math.min(255, pb + 40);
      }

      rawData[offset++] = pr;
      rawData[offset++] = pg;
      rawData[offset++] = pb;
      rawData[offset++] = pa;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

const items = [
  { file: 'lib-101.png', c1: [30, 41, 59], c2: [15, 23, 42], icon: 'book', name: 'Cien Años de Soledad' },
  { file: 'lib-102.png', c1: [14, 116, 144], c2: [3, 105, 161], icon: 'book', name: 'El Principito' },
  { file: 'lib-103.png', c1: [124, 45, 18], c2: [67, 20, 7], icon: 'book', name: 'Don Quijote' },
  { file: 'pap-201.png', c1: [16, 185, 129], c2: [5, 150, 105], icon: 'notebook', name: 'Cuaderno Oxford' },
  { file: 'pap-202.png', c1: [31, 41, 55], c2: [17, 24, 39], icon: 'notebook', name: 'Libreta Moleskine' },
  { file: 'uti-301.png', c1: [99, 102, 241], c2: [79, 70, 229], icon: 'pen', name: 'Pilot G2' },
  { file: 'uti-302.png', c1: [236, 72, 153], c2: [219, 39, 119], icon: 'pen', name: 'Stabilo Boss' },
  { file: 'uti-303.png', c1: [51, 65, 85], c2: [30, 41, 59], icon: 'math', name: 'Calculadora Casio' },
  { file: 'art-401.png', c1: [245, 158, 11], c2: [217, 119, 6], icon: 'art', name: 'Acuarelas Winsor' },
  { file: 'art-402.png', c1: [139, 92, 246], c2: [109, 40, 217], icon: 'notebook', name: 'Bloc Canson' }
];

console.log('Generando imágenes PNG para el catálogo de la librería...');
items.forEach(it => {
  const pngBuf = createStyledPng(256, 256, it.c1, it.c2, it.icon, it.name);
  const filePath = path.join(UPLOADS_DIR, it.file);
  fs.writeFileSync(filePath, pngBuf);
  console.log(`✔️ Creado: ${it.file} (${pngBuf.length} bytes)`);
});
console.log('Todas las imágenes PNG iniciales han sido creadas.');
