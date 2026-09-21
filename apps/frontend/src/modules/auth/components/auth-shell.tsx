import { AuthVisual } from './auth-visual';
import { useDesktopCompactWindow } from '@/modules/desktop';
import { cn } from '@/lib/utils';

interface AuthShellProps {
  /** 顶部品牌区（左上 logo 槽） */
  header?: React.ReactNode;
  /** 左栏主体：标题、副文案、表单 */
  children: React.ReactNode;
  /** 左栏贴底操作区：辅助链接 + 语言切换等 */
  footer?: React.ReactNode;
  /** 右栏视觉面板内容，缺省渲染默认 AuthVisual 拼贴 */
  visual?: React.ReactNode;
  className?: string;
}

/**
 * 认证面分栏壳（登录/注册/欢迎页共用）：桌面端左文右图，
 * 左栏纵向三段（品牌区 → 主体 my-auto 居中 → 操作区贴底），
 * 右栏满高圆角视觉面板；窄屏（<lg）隐藏右栏、表单全宽居中。
 * 极简区定位（宪法 §1.2）：留白、少 chrome、层级分明。
 */
export function AuthShell({ header, children, footer, visual, className }: AuthShellProps) {
  // 桌面壳：认证面期间主窗口收缩为紧凑小窗并隐藏标题栏（web 端 no-op）
  useDesktopCompactWindow();
  return (
    <div className="flex min-h-screen bg-background">
      <div
        className={cn(
          'flex w-full flex-col px-6 py-6 lg:w-104 lg:shrink-0 lg:px-10',
          className,
        )}
      >
        {/* 品牌行兼桌面紧凑窗口拖动区（-webkit-app-region 浏览器端无效） */}
        <div
          className="flex min-h-10 items-center"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          {header}
        </div>
        <div className="my-auto flex flex-col py-10">{children}</div>
        <div className="flex items-center justify-between gap-4">{footer}</div>
      </div>
      <div className="hidden flex-1 p-4 pl-0 lg:block">
        <div className="bg-secondary relative h-full overflow-hidden rounded-2xl">
          {visual ?? <AuthVisual />}
        </div>
      </div>
    </div>
  );
}
