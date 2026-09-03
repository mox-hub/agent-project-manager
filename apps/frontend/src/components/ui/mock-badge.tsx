// Mock 模式角标（宪法 §9.3）：mock 模式下全局显性化，避免评审时误判数据来源
import { FlaskConical } from 'lucide-react';
import { isMockModeEnabled } from '@/mocks';

export function MockBadge() {
  if (!isMockModeEnabled()) return null;
  return (
    <div className="fixed bottom-3 left-3 z-50 inline-flex items-center gap-1.5 rounded-full border border-accent-yellow/40 bg-accent-yellow/10 px-2.5 py-1 text-11 font-medium text-accent-yellow shadow-sm">
      <FlaskConical className="h-3 w-3" />
      MOCK
    </div>
  );
}
