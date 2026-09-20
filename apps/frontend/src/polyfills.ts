// 浏览器端 Node 全局 polyfill。
// gray-matter（文档 frontmatter 解析/序列化）内部使用裸 Buffer 全局
// （lib/utils.js toBuffer → Buffer.from），浏览器环境没有 Buffer，
// 会让文档编辑页「保存」在 mergeFrontmatter 处同步抛 ReferenceError，PUT 从未发出。
// 必须在应用入口最先引入。
import { Buffer as BufferPolyfill } from 'buffer';

if (typeof globalThis.Buffer === 'undefined') {
  (globalThis as unknown as { Buffer: typeof BufferPolyfill }).Buffer =
    BufferPolyfill;
}

export {};
