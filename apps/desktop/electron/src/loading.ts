/**
 * 品牌启动屏（CAP-A-14 v0.6.1 体验切片）：
 * 服务启动期间的全屏加载动画——logo + 轨道旋转弧 + 分阶段状态文字 + 底部进度条，
 * 取代原「只有文字」的内联页。阶段文案经 executeJavaScript 更新当前文档内的
 * window.__boot.set(...)，避免重新 loadURL 造成闪屏。
 */

const LOGO_SVG = `<svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
  <path d="M32 6 L54 19 L54 45 L32 58 L10 45 L10 19 Z" stroke="#58a6ff" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="32" cy="32" r="4.5" fill="#58a6ff"/>
  <circle cx="32" cy="15" r="3" fill="#3fb950"/>
  <circle cx="46" cy="40" r="3" fill="#bc8cff"/>
  <circle cx="18" cy="40" r="3" fill="#f0883e"/>
  <path d="M32 27.5 L32 18 M34.5 34.5 L43 38 M29.5 34.5 L21 38" stroke="#8b949e" stroke-width="2" stroke-linecap="round"/>
</svg>`;

const BOOT_HTML = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<title>正在启动 Agent Project Manager…</title><style>
*{box-sizing:border-box}
body{font-family:"Segoe UI",system-ui,-apple-system,sans-serif;margin:0;min-height:100vh;
background:radial-gradient(1200px 700px at 50% 35%,#161b27 0%,#0d1117 55%,#090c12 100%);
color:#e6edf3;display:flex;align-items:center;justify-content:center;overflow:hidden}
main{text-align:center;user-select:none;-webkit-user-select:none}
.logo-wrap{position:relative;width:132px;height:132px;margin:0 auto 28px}
.logo-wrap svg{position:absolute;inset:18px;width:96px;height:96px;animation:breath 2.6s ease-in-out infinite}
.orbit{position:absolute;inset:0;border-radius:50%;
border:3px solid transparent;border-top-color:#58a6ff;border-right-color:#1f6feb88;
animation:spin 1.15s linear infinite}
.orbit.slow{inset:-12px;border-width:1.5px;border-top-color:#30363d;border-right-color:transparent;
animation-duration:3.2s;animation-direction:reverse}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes breath{0%,100%{opacity:.85;transform:scale(.98)}50%{opacity:1;transform:scale(1.02)}}
h1{font-size:21px;font-weight:600;letter-spacing:.5px;margin:0 0 10px}
#status{font-size:13px;color:#8b949e;margin:0;min-height:20px;transition:opacity .18s ease}
#status.error{color:#f85149}
#detail{font-size:12px;color:#6e7681;max-width:560px;margin:10px auto 0;line-height:1.7;
white-space:pre-wrap;word-break:break-all;display:none;text-align:left}
#detail.error{display:block;color:#f85149cc}
.bar{position:fixed;left:0;right:0;bottom:0;height:3px;background:#21262d}
.bar i{position:absolute;top:0;bottom:0;width:34%;border-radius:3px;
background:linear-gradient(90deg,transparent,#58a6ff,transparent);animation:sweep 1.4s ease-in-out infinite}
@keyframes sweep{0%{left:-34%}100%{left:100%}}
.done .bar{display:none}
</style></head><body><main>
<div class="logo-wrap"><div class="orbit slow"></div><div class="orbit"></div>${LOGO_SVG}</div>
<h1>Agent Project Manager</h1>
<p id="status">正在启动…</p>
<p id="detail"></p>
</main><div class="bar"><i></i></div>
<script>
window.__boot = {
  set: function (msg, err, detail) {
    var s = document.getElementById('status');
    var d = document.getElementById('detail');
    s.textContent = msg;
    s.classList.toggle('error', !!err);
    d.textContent = detail || '';
    d.classList.toggle('error', !!err);
  },
  done: function () { document.body.classList.add('done'); }
};
</script></body></html>`;

export function bootScreenUrl(): string {
  return `data:text/html;charset=utf-8,${encodeURIComponent(BOOT_HTML)}`;
}

/** 在启动屏当前文档上更新阶段文案（loadAppSurface 换页后调用无效，属预期）。 */
export function bootStatusScript(message: string, detail?: string): string {
  return `window.__boot && window.__boot.set(${JSON.stringify(message)}, false, ${JSON.stringify(detail ?? '')})`;
}

export function bootErrorScript(message: string, detail?: string): string {
  return `window.__boot && window.__boot.set('启动失败', true, ${JSON.stringify(`${message}\n\n${detail ?? ''}`)})`;
}
