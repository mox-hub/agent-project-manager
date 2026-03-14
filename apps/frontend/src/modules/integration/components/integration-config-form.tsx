import { useState } from "react";
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure {integration.name}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <Label htmlFor="integration-name">Integration Name</Label>
            <Input
              id="integration-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="integration-enabled"
              checked={Boolean(formData.enabled)}
              onChange={(e) => setFormData({ ...formData, enabled: e.currentTarget.checked })}
            />
            <Label htmlFor="integration-enabled">Enable this integration</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateIntegration.isPending}>
              {updateIntegration.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
