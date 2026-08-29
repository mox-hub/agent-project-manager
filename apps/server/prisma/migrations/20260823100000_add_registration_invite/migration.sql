-- 全局注册邀请（管理员发起，凭 token 注册账号）
CREATE TABLE "RegistrationInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "RegistrationInvite_token_key" ON "RegistrationInvite"("token");
CREATE INDEX "idx_registration_invites_email" ON "RegistrationInvite"("email");
CREATE INDEX "idx_registration_invites_status" ON "RegistrationInvite"("status");
