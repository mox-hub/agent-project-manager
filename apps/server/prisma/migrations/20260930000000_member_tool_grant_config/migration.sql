-- AI 成员个人页重构（CAP-A-02 增强 2026-09-30）：MemberToolGrant 授权配置列
-- cli_tool 行可存 { model, thinkingLevel } 覆盖；NULL = 回落该 CLI 默认配置
ALTER TABLE "MemberToolGrant" ADD COLUMN "config" TEXT;
