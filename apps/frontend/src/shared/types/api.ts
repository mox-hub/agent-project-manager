/**
 * Shared API types for backend communication
 * 
 * This file defines the standard response wrapper format
 * Used to handle the mismatch between backend { data: T, meta: {...} } format and frontend expectations of T
 */

/**
 * Standard API response wrapper
 * 
 * Backend returns: { data: T, meta?: {...} }
 * Frontend expects: T
 * This wrapper adapts the response format uniformly
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

/**
 * Conversation list response
 */
export interface ConversationListResponse extends ApiResponse<AIConversation[]> {}

/**
 * Project list response
 */
export interface ProjectListResponse extends ApiResponse<Project[]> {}

/**
 * Integration list response
 */
export interface IntegrationListResponse extends ApiResponse<Integration[]> {}

/**
 * Notification list response
 */
export interface NotificationListResponse extends ApiResponse<Notification[]> {}

/**
 * Task list response
 */
export interface TaskListResponse extends ApiResponse<Task[]> {}

/**
 * Git workspace list response
 */
/**
 * Terminal session list response
 */
export interface TerminalSessionListResponse extends ApiResponse<TerminalSession[]> {}

/**
 * User profile response
 */
export interface UserResponse extends ApiResponse<UserProfile> {}

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
