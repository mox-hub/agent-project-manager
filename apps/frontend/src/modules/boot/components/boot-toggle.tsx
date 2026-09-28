import { FieldLabel } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export interface BootToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  className?: string;
}

export function BootToggle({ checked, onChange, className }: BootToggleProps) {
  return (
    <FieldLabel size="xs" variant="muted"
      htmlFor="boot-skip-toggle"
      className={`flex cursor-pointer items-center gap-2 text-xs text-muted-foreground ${className ?? ''}`}
    >
      <Switch
        id="boot-skip-toggle"
        size="sm"
        checked={checked}
        onCheckedChange={onChange}
      />
      <Label htmlFor="boot-skip-toggle" className="cursor-pointer">
        下次启动时跳过此页
      </Label>
    </FieldLabel>
  );
}

export default BootToggle;