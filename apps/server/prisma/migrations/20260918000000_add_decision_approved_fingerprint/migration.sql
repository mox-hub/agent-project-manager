-- CAP-C-04：决策提案批准绑定内容指纹——实质变更后不得沿用旧批准。
-- approvedFingerprint = 批准（accept）时实质内容（kind/title/detail/payload/projectId/issueId）
-- 规范化序列化后的 sha256 hex；内容变更后与当前指纹失配即批准过期。
ALTER TABLE "DecisionProposal" ADD COLUMN "approvedFingerprint" TEXT;
