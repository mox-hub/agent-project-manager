/**
 * 动态追踪模块（task / bug / project 通用操作记录、评论、表情回应）
 */
export { ActivityFeed } from './components/activity-feed';
export { ActivityComment } from './components/activity-comment';
export { CommentInput } from './components/comment-input';
export { ReactionBar } from './components/reaction-bar';
export {
  useActivities,
  useAddComment,
  useUpdateComment,
  useDeleteComment,
  useToggleReaction,
} from './hooks/use-activity';
export { activityApi } from './api/activity-api';
export type {
  ActivityEntityType,
  ActivityItem,
  ActivityActor,
  ActivityChange,
  ActivityReactionGroup,
} from './api/activity-api';
