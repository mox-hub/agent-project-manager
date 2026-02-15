import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// #region agent log
// Log before import attempt
if (typeof window !== 'undefined') {
  fetch('http://127.0.0.1:7242/ingest/359cd667-d83e-4a1f-b9bd-24efc6dd110b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-repositories.ts:2',message:'Before import - checking import syntax',data:{importStatement:'import { gitApi, type CreateRepositoryDto }',hasTypeKeyword:true,verbatimModuleSyntax:true},timestamp:Date.now(),runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
  // Try dynamic import to see what's actually exported
  import('../api/git-api').then(module => {
    const moduleKeys = Object.keys(module);
    const hasCreateRepositoryDto = 'CreateRepositoryDto' in module;
    const hasGitApi = 'gitApi' in module;
    const createRepositoryDtoType = typeof (module as any).CreateRepositoryDto;
    fetch('http://127.0.0.1:7242/ingest/359cd667-d83e-4a1f-b9bd-24efc6dd110b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-repositories.ts:2',message:'Dynamic import - checking available exports',data:{moduleKeys,hasCreateRepositoryDto,hasGitApi,createRepositoryDtoType,allKeys:Object.getOwnPropertyNames(module)},timestamp:Date.now(),runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
  }).catch(e => {
    fetch('http://127.0.0.1:7242/ingest/359cd667-d83e-4a1f-b9bd-24efc6dd110b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-repositories.ts:2',message:'Dynamic import error',data:{error:String(e),errorName:e?.name,errorMessage:e?.message},timestamp:Date.now(),runId:'post-fix',hypothesisId:'D'})}).catch(()=>{});
  });
}
// #endregion
import { gitApi, type CreateRepositoryDto } from '../api/git-api';
// #region agent log
// Log after import attempt (if it succeeds)
if (typeof window !== 'undefined') {
  try {
    const hasGitApiAfter = typeof gitApi !== 'undefined';
    const hasCreateRepositoryDtoAfter = typeof (globalThis as any).CreateRepositoryDto !== 'undefined';
    fetch('http://127.0.0.1:7242/ingest/359cd667-d83e-4a1f-b9bd-24efc6dd110b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-repositories.ts:11',message:'After import attempt',data:{hasGitApiAfter,hasCreateRepositoryDtoAfter,importSucceeded:true},timestamp:Date.now(),runId:'post-fix',hypothesisId:'E'})}).catch(()=>{});
  } catch (e) {
    fetch('http://127.0.0.1:7242/ingest/359cd667-d83e-4a1f-b9bd-24efc6dd110b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-repositories.ts:11',message:'Import failed',data:{error:String(e),errorName:e?.name,errorMessage:e?.message},timestamp:Date.now(),runId:'post-fix',hypothesisId:'E'})}).catch(()=>{});
  }
}
// #endregion

export function useRepositories(params?: {
  projectId?: string;
  provider?: string;
}) {
  return useQuery({
    queryKey: ['repositories', params],
    queryFn: () => gitApi.getRepositories(params).then((res) => res.data),
  });
}

export function useRepository(repoId: string) {
  return useQuery({
    queryKey: ['repository', repoId],
    queryFn: () => gitApi.getRepositoryById(repoId).then((res) => res.data),
    enabled: !!repoId,
  });
}

export function useRepositoryStatus(repoId: string) {
  return useQuery({
    queryKey: ['repository-status', repoId],
    queryFn: () => gitApi.getRepositoryStatus(repoId).then((res) => res.data),
    enabled: !!repoId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useCreateRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateRepositoryDto) =>
      gitApi.createRepository(dto).then((res) => res.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      queryClient.invalidateQueries({ queryKey: ['repository', data.id] });
    },
  });
}
