import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export interface BootToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  className?: string;
}

export function BootToggle({ checked, onChange, className }: BootToggleProps) {
  return (
    <label
      htmlFor="boot-skip-toggle"
      className={`flex cursor-pointer items-center gap-2 text-xs text-muted-foreground ${className ?? ''}`}
    >
      <Switch
        id="boot-skip-toggle"
        size="sm"
        checked={checked}
        onCheckedChange={onChange}
      />
      <Label htmlFor="boot-skip-toggle" className="cursor-pointer text-xs font-normal">
        下次启动时跳过此页
      </Label>
    </label>
  );
}

export default BootToggle;