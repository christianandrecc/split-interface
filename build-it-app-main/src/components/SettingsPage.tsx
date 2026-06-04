import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Bell, FileText, Lock, Save, Settings2, ShieldCheck } from "lucide-react";

type AppSettings = {
  defaultSplitMethod: string;
  defaultTerritory: string;
  defaultUserRole: string;
  requireHundredPercent: boolean;
  warnMissingRegistration: boolean;
  autoAddSelf: boolean;
  emailOnSignature: boolean;
  emailOnComment: boolean;
  remindUnsignedParties: boolean;
  reminderCadence: string;
  hideContactFromCollaborators: boolean;
  requireApprovalBeforeSharing: boolean;
  includeAuditTrail: boolean;
};

const defaultSettings: AppSettings = {
  defaultSplitMethod: "Custom",
  defaultTerritory: "Worldwide",
  defaultUserRole: "Songwriter",
  requireHundredPercent: true,
  warnMissingRegistration: true,
  autoAddSelf: true,
  emailOnSignature: true,
  emailOnComment: true,
  remindUnsignedParties: true,
  reminderCadence: "Every 3 days",
  hideContactFromCollaborators: true,
  requireApprovalBeforeSharing: true,
  includeAuditTrail: true,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [saved, setSaved] = useState(false);

  const update = <Key extends keyof AppSettings>(key: Key, value: AppSettings[Key]) => {
    setSaved(false);
    setSettings((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-5 md:px-8 md:py-8">
        <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">Control how SPLIT creates, shares, and manages song ownership split sheets.</p>
          </div>
          <Button onClick={() => setSaved(true)} className="h-11 md:px-6">
            <Save className="h-4 w-4" />
            {saved ? "Saved" : "Save Settings"}
          </Button>
        </div>

        <div className="grid gap-5">
          <SettingsSection icon={<Settings2 className="h-4 w-4" />} title="SPLIT Sheet Defaults">
            <div className="grid gap-4 md:grid-cols-3">
              <SelectField
                label="Default Split Method"
                value={settings.defaultSplitMethod}
                onValueChange={(value) => update("defaultSplitMethod", value)}
                options={["Equal", "Custom", "Role-based", "Manually negotiated"]}
              />
              <SelectField
                label="Default Territory"
                value={settings.defaultTerritory}
                onValueChange={(value) => update("defaultTerritory", value)}
                options={["Worldwide", "United States", "North America", "Custom"]}
              />
              <SelectField
                label="Default Role"
                value={settings.defaultUserRole}
                onValueChange={(value) => update("defaultUserRole", value)}
                options={["Songwriter", "Composer", "Lyricist", "Topliner", "Beatmaker (Composition)", "Contributor"]}
              />
            </div>
            <ToggleRow
              title="Auto-add me to new split sheets"
              description="Adds your profile as an initial writer when you start a split sheet."
              checked={settings.autoAddSelf}
              onCheckedChange={(checked) => update("autoAddSelf", checked)}
            />
          </SettingsSection>

          <SettingsSection icon={<ShieldCheck className="h-4 w-4" />} title="Split Sheet Rules">
            <ToggleRow
              title="Require splits to total 100%"
              description="Prevent sending a split sheet until writer shares add up correctly."
              checked={settings.requireHundredPercent}
              onCheckedChange={(checked) => update("requireHundredPercent", checked)}
            />
            <ToggleRow
              title="Warn about missing PRO or MLC details"
              description="Show a warning when writers are missing IPI, PRO, publisher/admin, ISWC, or ISRC details."
              checked={settings.warnMissingRegistration}
              onCheckedChange={(checked) => update("warnMissingRegistration", checked)}
            />
          </SettingsSection>

          <SettingsSection icon={<Bell className="h-4 w-4" />} title="Notifications">
            <ToggleRow
              title="Email me when someone signs"
              description="Get notified as soon as a writer signs a split sheet."
              checked={settings.emailOnSignature}
              onCheckedChange={(checked) => update("emailOnSignature", checked)}
            />
            <ToggleRow
              title="Email me when someone proposes an edit"
              description="Stay aware of writer share, metadata, clearance, and registration changes."
              checked={settings.emailOnComment}
              onCheckedChange={(checked) => update("emailOnComment", checked)}
            />
            <div className="grid gap-4 md:grid-cols-[1fr_220px] md:items-end">
              <ToggleRow
                title="Remind unsigned parties"
                description="Send follow-up reminders when writer signatures are still pending."
                checked={settings.remindUnsignedParties}
                onCheckedChange={(checked) => update("remindUnsignedParties", checked)}
              />
              <SelectField
                label="Reminder Timing"
                value={settings.reminderCadence}
                onValueChange={(value) => update("reminderCadence", value)}
                options={["Every day", "Every 3 days", "Weekly", "Never"]}
              />
            </div>
          </SettingsSection>

          <SettingsSection icon={<Lock className="h-4 w-4" />} title="Privacy & Sharing">
            <ToggleRow
              title="Hide my phone and address from collaborators"
              description="Collaborators can still sign, but sensitive contact details stay private."
              checked={settings.hideContactFromCollaborators}
              onCheckedChange={(checked) => update("hideContactFromCollaborators", checked)}
            />
            <ToggleRow
              title="Require approval before sharing split sheets"
              description="Adds a confirmation step before sending split sheet data to a PRO, MLC, publisher, or administrator."
              checked={settings.requireApprovalBeforeSharing}
              onCheckedChange={(checked) => update("requireApprovalBeforeSharing", checked)}
            />
          </SettingsSection>

          <SettingsSection icon={<FileText className="h-4 w-4" />} title="Document Preferences">
            <ToggleRow
              title="Include signature audit trail on exports"
              description="Attach signing, amendment, and version history when exporting split sheet packets."
              checked={settings.includeAuditTrail}
              onCheckedChange={(checked) => update("includeAuditTrail", checked)}
            />
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}

function SettingsSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
        <h2 className="text-sm font-bold">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function SelectField({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background px-4 py-3">
      <div>
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
