import { Module } from '@nestjs/common';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceBackupService } from './backup.service';
import { WorkspacePublicSettingsService } from './public-settings.service';

@Module({
  controllers: [WorkspaceController],
  providers: [WorkspaceBackupService, WorkspacePublicSettingsService],
})
export class WorkspaceModule {}
