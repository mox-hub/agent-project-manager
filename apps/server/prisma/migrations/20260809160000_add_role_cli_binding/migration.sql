-- Add CLI Provider binding to Member and ProjectRoleDefinition
-- 为垂直切片（PM -> Coder 自动派发）提供绑定层
--
-- Member: 增加 defaultCliProviderId（员工级覆盖）+ defaultExecutionRole（员工默认执行角色）
-- ProjectRoleDefinition: 增加 executionRole / defaultCliProviderId / promptHint（角色级绑定）

-- 1) Member 加列
ALTER TABLE "Member" ADD COLUMN "defaultCliProviderId" TEXT;
ALTER TABLE "Member" ADD COLUMN "defaultExecutionRole" TEXT;

CREATE INDEX IF NOT EXISTS "idx_members_default_cli_provider" ON "Member"("defaultCliProviderId");

-- 2) ProjectRoleDefinition 加列（executionRole 加默认值 'general'，与 schema 一致）
ALTER TABLE "ProjectRoleDefinition" ADD COLUMN "executionRole" TEXT NOT NULL DEFAULT 'general';
ALTER TABLE "ProjectRoleDefinition" ADD COLUMN "defaultCliProviderId" TEXT;
ALTER TABLE "ProjectRoleDefinition" ADD COLUMN "promptHint" TEXT;

CREATE INDEX IF NOT EXISTS "idx_project_roles_execution_role" ON "ProjectRoleDefinition"("executionRole");
CREATE INDEX IF NOT EXISTS "idx_project_roles_default_cli_provider" ON "ProjectRoleDefinition"("defaultCliProviderId");
