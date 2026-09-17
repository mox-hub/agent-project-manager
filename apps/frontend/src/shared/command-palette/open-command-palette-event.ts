/**
 * 外部入口（如 TabBar「+」按钮、Dock 搜索按钮）请求打开命令面板的 CustomEvent 名。
 * 独立成文件避免消费方为拿一个常量拉进 provider 整链（含 i18n 实例）。
 */
export const OPEN_COMMAND_PALETTE_EVENT = 'open-command-palette';
