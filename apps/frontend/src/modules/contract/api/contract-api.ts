import { api } from '@/infrastructure/api-client';
import type {
  RequestBodyOf,
  ResponseOf,
} from '@/infrastructure/api-client/contract';

export type ContractBindingsResponse = ResponseOf<'ContractController_listBindings'>;
export type ContractBinding = ResponseOf<'ContractController_setSyncMode'>;
export type SeedContractFilesRequest = RequestBodyOf<'ContractController_seed'>;
export type SeedContractResult = ResponseOf<'ContractController_seed'>;
export type CheckAlignmentRequest = RequestBodyOf<'ContractController_check'>;
export type ContractAlignmentReport = ResponseOf<'ContractController_check'>[number];
export type UpdateContractBindingRequest = RequestBodyOf<'ContractController_setSyncMode'>;

export type ContractFileTypeOption =
  | 'agents'
  | 'claude_alias'
  | 'changelog'
  | 'readme'
  | 'docs_dir';
export type ContractSyncModeOption = 'managed' | 'synced' | 'detached';

/** 契约绑定 REST 面（/projects/:projectId/contract/*，v2 纪要三期） */
export const contractApi = {
  listBindings: (projectId: string) =>
    api.get<ContractBindingsResponse>(
      `/projects/${projectId}/contract/bindings`,
    ),

  seed: (projectId: string, body: SeedContractFilesRequest = {}) =>
    api.post<SeedContractResult>(`/projects/${projectId}/contract/seed`, body),

  check: (projectId: string, body: CheckAlignmentRequest = {}) =>
    api.post<ContractAlignmentReport[]>(
      `/projects/${projectId}/contract/check`,
      body,
    ),

  setSyncMode: (
    projectId: string,
    fileType: ContractFileTypeOption,
    body: UpdateContractBindingRequest,
  ) =>
    api.patch<ContractBinding>(
      `/projects/${projectId}/contract/bindings/${fileType}`,
      body,
    ),
};
