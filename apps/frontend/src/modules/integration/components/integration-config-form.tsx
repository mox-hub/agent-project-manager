import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { type IntegrationConfig, type UpdateIntegrationConfigRequest } from "../api/integration-api";
import { useUpdateIntegration } from "../hooks/use-integrations";

interface IntegrationConfigFormProps {
  integration: IntegrationConfig;
  onClose?: () => void;
}

export function IntegrationConfigForm({ integration, onClose }: IntegrationConfigFormProps) {
  const { t } = useTranslation();
  const aiPrefix = `integration.integration-list.config.${integration.id}`;
  const updateIntegration = useUpdateIntegration();
  const [formData, setFormData] = useState<UpdateIntegrationConfigRequest>({
    name: integration.name,
    enabled: integration.enabled,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateIntegration.mutateAsync({
        id: integration.id,
        data: formData,
      });
      onClose?.();
    } catch (error) {
      console.error("Failed to update integration:", error);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent
        className="rounded-xl border-border"
        data-ai-component={aiPrefix}
        data-ai-role="panel"
      >
        <DialogHeader>
          <DialogTitle>{t('integration.form.configureTitle', { name: integration.name })}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit} data-ai-component={`${aiPrefix}.form`} data-ai-role="input">
          <div className="space-y-1">
            <Label htmlFor="integration-name">{t('integration.form.nameLabel')}</Label>
            <Input
              id="integration-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              data-ai-component={`${aiPrefix}.name`}
              data-ai-action={`${aiPrefix}.name.change`}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="integration-enabled"
              checked={Boolean(formData.enabled)}
              onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              data-ai-component={`${aiPrefix}.enabled`}
              data-ai-action={`${aiPrefix}.enabled.toggle`}
              data-ai-role="select"
            />
            <Label htmlFor="integration-enabled">{t('integration.form.enableLabel')}</Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              data-ai-component={`${aiPrefix}.cancel`}
              data-ai-action={`${aiPrefix}.cancel.click`}
              data-ai-role="jump"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={updateIntegration.isPending}
              data-ai-component={`${aiPrefix}.save`}
              data-ai-action={`${aiPrefix}.save.click`}
              data-ai-role="submit"
            >
              {updateIntegration.isPending ? t('integration.form.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
