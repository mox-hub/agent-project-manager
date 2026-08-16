import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiHubApi, ValidateProviderRequest, ValidateProviderResponse } from '../api/ai-hub-api';

export type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

/**
 * 校验 Provider 凭证的 Hook
 * 支持实时校验 API Key（不落库）
 */
export function useValidateProvider() {
  const [validationResult, setValidationResult] = useState<ValidateProviderResponse | null>(null);

  const mutation = useMutation({
    mutationFn: (data: ValidateProviderRequest) => aiHubApi.validateProvider(data),
    onSuccess: (result) => {
      setValidationResult(result);
    },
    onError: (error) => {
      setValidationResult({
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      });
    },
  });

  const validate = (data: ValidateProviderRequest) => {
    setValidationResult(null);
    mutation.mutate(data);
  };

  const reset = () => {
    setValidationResult(null);
    mutation.reset();
  };

  return {
    validate,
    reset,
    validationResult,
    isValidating: mutation.isPending,
    isValid: validationResult?.valid === true,
    isInvalid: validationResult?.valid === false,
    error: validationResult?.error,
    models: validationResult?.models,
  };
}

/**
 * 简化的验证状态 Hook
 * 返回 UI 所需的状态
 */
export function useProviderValidation(
  providerId: string | undefined,
  onValidationSuccess?: () => void
) {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<ValidationStatus>('idle');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const mutation = useMutation({
    mutationFn: (data: ValidateProviderRequest) => aiHubApi.validateProvider(data),
    onMutate: () => {
      setStatus('validating');
      setErrorMessage(undefined);
    },
    onSuccess: (result) => {
      if (result.valid) {
        setStatus('valid');
        const models = result.models || [];
        setAvailableModels(models);
        onValidationSuccess?.();
      } else {
        setStatus('invalid');
        setErrorMessage(result.error);
      }
    },
    onError: (error) => {
      setStatus('invalid');
      setErrorMessage(error instanceof Error ? error.message : 'Validation failed');
    },
  });

  const validate = (provider: string, apiKeyValue: string, baseUrl?: string) => {
    setApiKey(apiKeyValue);
    mutation.mutate({
      provider: provider as any,
      apiKey: apiKeyValue,
      baseUrl,
    });
  };

  const reset = () => {
    setStatus('idle');
    setAvailableModels([]);
    setErrorMessage(undefined);
    mutation.reset();
  };

  return {
    status,
    apiKey,
    availableModels,
    errorMessage,
    validate,
    reset,
    isValidating: mutation.isPending,
  };
}
