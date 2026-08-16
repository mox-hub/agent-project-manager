# Tauri Icons

此目录用于存放应用图标。

## 必需图标

- `icon.ico` — Windows 应用图标（必填）
- `icon.png` — PNG 格式图标（必填）

## 生成方式

使用 Tauri 官方图标生成工具：

```bash
# 在 src-tauri 目录执行
pnpm tauri icon <你的 1024x1024 PNG 图片路径>
```

## 临时方案

如暂未准备好图标，可将 `tauri.conf.json` 中的 `icon` 字段留空或指向空数组，
Tauri 会在开发模式下使用默认图标。打包发布前请务必替换为正式图标。
