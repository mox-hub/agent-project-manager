/**
 * Shared API types for backend communication
 *
 * This file defines standard response wrapper format
 * Used to handle mismatch between backend { data: T, meta: {...} } format and frontend expectations of T
 */

/**
 * Standard API response wrapper
 *
 * Backend returns: { data: T, meta?: {...} }
 * Frontend expects: T
 * This wrapper adapts response format uniformly
 *
 * @template T
 */
export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

// Import types from their respective modules
// These will be resolved by TypeScript module resolution

/**
 * Conversation list response
 * Backend returns: { data: AIConversation[], meta: { page, pageSize, total } }
 */
export interface ConversationListResponse {
  data: any[];
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

/**
 * Project list response
 * Backend returns: { data: Project[], meta: { page, pageSize, total } }
 */
export interface ProjectListResponse {
  data: any[];
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

/**
 * Integration list response
 * Backend returns: { data: Integration[], meta: { page, pageSize, total } }
 */
export interface IntegrationListResponse {
  data: any[];
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

/**
 * Notification list response
 * Backend returns: { data: Notification[], meta: { page, pageSize, total } }
 */
export interface NotificationListResponse {
  data: any[];
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

/**
 * Task list response
 * Backend returns: { data: Task[], meta: { page, pageSize, total } }
 */
export interface TaskListResponse {
  data: any[];
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

/**
 * Terminal session list response
 * Backend returns: { data: TerminalSession[], meta: { page, pageSize, total } }
 */
export interface TerminalSessionListResponse {
  data: any[];
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

/**
 * User profile response
 */
export interface UserResponse {
  data: any;
}

/**
 * Generic success response
 */
export interface SuccessResponse extends ApiResponse<void> {}

/**
 * Generic error response
 */
export interface ErrorResponse extends ApiResponse<{ message: string; code: number; }> {}

/**
 * Paginated query response helper
 */
export interface PaginatedQueryParams {
  page?: number;
  pageSize?: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> extends ApiResponse<{
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}> {}

/**
 * Response with pagination support
 */
export type PaginatedApiResponse<T> = ApiResponse<T> & {
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
};
