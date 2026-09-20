-- 项目档案（profile）切片：MemoryAtom 加 slot 列。
-- 非空 = 档案原子（AI 考古草稿/人编辑的项目档案），挂内置槽位注册表
-- （tech-stack | module-map | conventions | risks | tech-debts）；空 = 普通记忆原子。
ALTER TABLE "MemoryAtom" ADD COLUMN "slot" TEXT;
CREATE INDEX "idx_memory_atoms_scope_slot_lifecycle" ON "MemoryAtom"("scope", "slot", "lifecycle");
