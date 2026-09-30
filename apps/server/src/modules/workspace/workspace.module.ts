import { Module } from '@nestjs/common';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceBackupService } from './backup.service';

@Module({
  controllers: [WorkspaceController],
  providers: [WorkspaceBackupService],
})
export class WorkspaceModule {}
