// Shared Member components
// 这些组件是跨模块复用的展示型组件，
// 推荐直接 import { MemberAvatar, MemberChip, MemberCardPopover, MemberPicker } from '@/shared/member'
export { MemberAvatar } from '@/modules/team-member/components/member-avatar';
export { MemberChip } from '@/modules/team-member/components/member-chip';
export { MemberCardPopover } from '@/modules/team-member/components/member-card-popover';
export { MemberPicker } from '@/modules/team-member/components/member-picker';
export { MemberCreateDialog } from '@/modules/team-member/components/member-create-dialog';
export type { Member, MemberCard, MemberType } from '@/modules/team-member/types';
export * from './types';
