-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MemberProjectBinding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "source" TEXT NOT NULL DEFAULT 'direct',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_MemberProjectBinding" ("id", "joinedAt", "memberId", "projectId", "role") SELECT "id", "joinedAt", "memberId", "projectId", "role" FROM "MemberProjectBinding";
DROP TABLE "MemberProjectBinding";
ALTER TABLE "new_MemberProjectBinding" RENAME TO "MemberProjectBinding";
CREATE INDEX "idx_member_project_bindings_member_id" ON "MemberProjectBinding"("memberId");
CREATE INDEX "idx_member_project_bindings_project_id" ON "MemberProjectBinding"("projectId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

