/**
 * 从项目内置 logo（apps/frontend/public/logo.svg）生成桌面壳全部品牌资源：
 *   - build/icon.ico                 应用/安装器/卸载器图标（16–256 七帧 PNG 压缩帧）
 *   - src-tauri/icons/icon.ico+png   与 Tauri 打包链共用同源图标（保持一致）
 *   - build/installerHeader.bmp      NSIS 向导顶部横幅（150x57）
 *   - build/installerSidebar.bmp     NSIS 向导欢迎页左侧竖图（164x314）
 * 渲染经 @playwright/test 的 chromium（前端 e2e 已装，无新依赖）；ICO/BMP 容器为手写编码。
 * logo 变更后重跑：node.exe scripts/gen-icon.mjs（需在 apps/desktop 下执行）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(desktopRoot, '..', '..');
const logoPath = path.join(repoRoot, 'apps', 'frontend', 'public', 'logo.svg');

const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];
const HEADER_SIZE = { width: 150, height: 57 };
const SIDEBAR_SIZE = { width: 164, height: 314 };
const TRAY_SIZE = 32; // Windows 托盘标准尺寸，高 DPI 由系统缩放
const BRAND_BG = '#0A0A0A'; // 与 logo.svg 底色一致

const require = createRequire(path.join(repoRoot, 'apps', 'frontend', 'package.json'));
const { chromium } = require('@playwright/test');

const svg = fs.readFileSync(logoPath, 'utf8');
const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage();

  /** SVG 矢量直出任意尺寸 PNG（omitBackground 保留圆角矩形外透明区） */
  const renderPng = async (size) => {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<body style="margin:0"><img src="${dataUrl}" style="display:block;width:${size}px;height:${size}px"></body>`,
    );
    await page.waitForFunction(
      (src) => document.querySelector('img')?.src === src && document.querySelector('img')?.complete,
      dataUrl,
    );
    return page.screenshot({ omitBackground: true, type: 'png' });
  };

  /** 品牌底 + logo 居中等比绘制，直接从 canvas 取 RGBA 像素 */
  const renderCanvasRgba = async ({ width, height }, logoScale = 0.62) => {
    await page.setViewportSize({ width, height });
    await page.setContent(
      `<body style="margin:0"><canvas id="c" width="${width}" height="${height}"></canvas><img id="i" src="${dataUrl}" style="display:none"></body>`,
    );
    await page.waitForFunction(
      (src) => document.querySelector('#i')?.src === src && document.querySelector('#i')?.complete,
      dataUrl,
    );
    return page.evaluate(
      ({ width, height, logoScale }) => {
        const img = document.querySelector('#i');
        const ctx = document.querySelector('#c').getContext('2d');
        ctx.fillStyle = '#0A0A0A';
        ctx.fillRect(0, 0, width, height);
        const s = (Math.min(width / img.naturalWidth, height / img.naturalHeight) * logoScale);
        const dw = img.naturalWidth * s;
        const dh = img.naturalHeight * s;
        ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh);
        return Array.from(ctx.getImageData(0, 0, width, height).data);
      },
      { width, height, logoScale },
    );
  };

  /** 24bpp 未压缩 BMP（NSIS 位图要求：BGR 三字节、行 4 字节对齐、自下而上） */
  const encodeBmp = (rgba, width, height) => {
    const rowSize = Math.ceil((width * 3) / 4) * 4;
    const pixelArraySize = rowSize * height;
    const buf = Buffer.alloc(54 + pixelArraySize);
    buf.write('BM', 0);
    buf.writeUInt32LE(buf.length, 2);
    buf.writeUInt32LE(54, 10);
    buf.writeUInt32LE(40, 14); // BITMAPINFOHEADER
    buf.writeInt32LE(width, 18);
    buf.writeInt32LE(height, 22);
    buf.writeUInt16LE(1, 26); // planes
    buf.writeUInt16LE(24, 28); // bpp
    buf.writeUInt32LE(pixelArraySize, 34);
    let off = 54;
    for (let y = height - 1; y >= 0; y--) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        buf[off++] = rgba[i + 2];
        buf[off++] = rgba[i + 1];
        buf[off++] = rgba[i];
      }
      off += rowSize - width * 3;
    }
    return buf;
  };

  const frames = [];
  for (const size of ICO_SIZES) {
    frames.push({ size, png: await renderPng(size) });
    console.log(`rendered ${size}x${size} PNG (${frames.at(-1).png.length} bytes)`);
  }
  const png512 = await renderPng(512);

  // ICO 容器：ICONDIR(6B) + ICONDIRENTRY(16B)×N + PNG 帧原样嵌入（Vista+ PNG 压缩帧标准用法）
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type=icon
  header.writeUInt16LE(frames.length, 4);
  const entries = Buffer.alloc(16 * frames.length);
  let offset = header.length + entries.length;
  frames.forEach((f, i) => {
    const base = i * 16;
    entries.writeUInt8(f.size === 256 ? 0 : f.size, base); // bWidth（256 记 0）
    entries.writeUInt8(f.size === 256 ? 0 : f.size, base + 1); // bHeight
    entries.writeUInt16LE(1, base + 4); // wPlanes
    entries.writeUInt16LE(32, base + 6); // wBitCount
    entries.writeUInt32LE(f.png.length, base + 8); // dwBytesInRes
    entries.writeUInt32LE(offset, base + 12); // dwImageOffset
    offset += f.png.length;
  });
  const ico = Buffer.concat([header, entries, ...frames.map((f) => f.png)]);
  fs.writeFileSync(path.join(desktopRoot, 'build', 'icon.ico'), ico);
  fs.copyFileSync(path.join(desktopRoot, 'build', 'icon.ico'), path.join(desktopRoot, 'src-tauri', 'icons', 'icon.ico'));
  fs.writeFileSync(path.join(desktopRoot, 'src-tauri', 'icons', 'icon.png'), png512);
  console.log(`icon.ico written: ${frames.length} frames, ${ico.length} bytes`);

  for (const [name, box] of [['installerHeader', HEADER_SIZE], ['installerSidebar', SIDEBAR_SIZE]]) {
    const rgba = await renderCanvasRgba(box);
    fs.writeFileSync(path.join(desktopRoot, 'build', `${name}.bmp`), encodeBmp(rgba, box.width, box.height));
    console.log(`${name}.bmp written (${box.width}x${box.height})`);
  }

  // 托盘图标（透明底、无品牌底板，随 electron/assets 进包；tray.ts 消费）
  fs.mkdirSync(path.join(desktopRoot, 'electron', 'assets'), { recursive: true });
  fs.writeFileSync(path.join(desktopRoot, 'electron', 'assets', 'tray.png'), await renderPng(TRAY_SIZE));
  console.log(`tray.png written (${TRAY_SIZE}x${TRAY_SIZE})`);
} finally {
  await browser.close();
}
