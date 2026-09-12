/**
 * view-types.ts - 全局视图模式与显示偏好统一类型
 */

export type ViewMode = 'list' | 'board' | 'gantt' | 'table' | 'grid';

export interface ViewDisplayConfig {
  // 通用
  groupBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  
  // List 专属
  listDensity?: 'dense' | 'comfortable';
  showSubissues?: boolean;

  // Board 专属
  boardSwimlane?: string;
  boardCardDetail?: 'compact' | 'full';
  collapsedColumns?: string[];

  // Gantt 专属
  ganttScale?: 'day' | 'week' | 'month' | 'quarter';
  showDependencies?: boolean;

  // Table 专属
  tableVisibleColumns?: string[];
  tableDensity?: 'dense' | 'normal';
}
