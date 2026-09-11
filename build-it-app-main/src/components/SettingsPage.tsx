import { useId, useState, type ReactNode } from "react";
import { Bell, Check, FileText, Lock, RotateCcw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useContentEntrance } from "@/hooks/use-content-entrance";
import { useIsMobile } from "@/hooks/use-mobile";
import { CREATOR_ROLE_OPTIONS, getPrimaryCreatorRole } from "@/lib/creatorRoles";
import type { UserProfile } from "@/lib/userProfile";
import "./settings.css";

type AppSettings = {
  defaultSplitMethod: "Equal" | "Custom";
  defaultTerritory: string;
  defaultUserRole: string;
  emailOnSignature: boolean;
  emailOnComment: boolean;
  remindUnsignedParties: boolean;
  reminderCadence: string;
  hideContactFromCollaborators: boolean;
  requireApprovalBeforeSharing: boolean;
  includeAuditTrail: boolean;
};

const categories = [
  { id: "defaults", label: "Split defaults", title: "Split sheet defaults", icon: Settings2, keys: ["defaultSplitMethod", "defaultTerritory", "defaultUserRole"] },
  { id: "notifications", label: "Notifications", title: "Notifications", icon: Bell, keys: ["emailOnSignature", "emailOnComment", "remindUnsignedParties", "reminderCadence"] },
  { id: "privacy", label: "Privacy & sharing", title: "Privacy & sharing", icon: Lock, keys: ["hideContactFromCollaborators", "requireApprovalBeforeSharing"] },
  { id: "documents", label: "Documents", title: "Document preferences", icon: FileText, keys: ["includeAuditTrail"] },
] as const;

export default function SettingsPage({ userProfile }: { userProfile: UserProfile }) {
  return <SettingsPreview key={userProfile.authUserId || userProfile.username || userProfile.emailAddress || userProfile.splitId} userProfile={userProfile} />;
}

function SettingsPreview({ userProfile }: { userProfile: UserProfile }) {
  const [settings, setSettings] = useState<AppSettings>(() => ({
    defaultSplitMethod: "Custom",
    defaultTerritory: "Worldwide",
    defaultUserRole: getPrimaryCreatorRole(userProfile.roleTags),
    emailOnSignature: true,
    emailOnComment: true,
    remindUnsignedParties: true,
    reminderCadence: "Every 3 days",
    hideContactFromCollaborators: true,
    requireApprovalBeforeSharing: true,
    includeAuditTrail: true,
  }));
  // This design preview intentionally does not persist or change live preferences.
  const [applied, setApplied] = useState(settings);
  const [previewApplied, setPreviewApplied] = useState(false);
  const [category, setCategory] = useState("defaults");
  const isMobile = useIsMobile();
  const panelRef = useContentEntrance<HTMLDivElement>(category);
  const methodLabelId = useId();
  const changes = (Object.keys(settings) as (keyof AppSettings)[]).filter((key) => settings[key] !== applied[key]);

  const update = <Key extends keyof AppSettings>(key: Key, value: AppSettings[Key]) => {
    setPreviewApplied(false);
    setSettings((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="settings-page" aria-label="Settings preview">
      <div className="settings-shell">
        <header className="settings-heading">
          <h1>Settings</h1>
        </header>

        <Tabs value={category} onValueChange={setCategory} orientation={isMobile ? "horizontal" : "vertical"} className="settings-layout">
          <TabsList className="settings-navigation" aria-label="Settings categories">
            {categories.map(({ id, label, icon: Icon, keys }) => (
              <TabsTrigger key={id} value={id} className="settings-nav-item" aria-label={label} aria-description={keys.some((key) => settings[key] !== applied[key]) ? "Unapplied preview changes" : undefined}>
                <Icon size={17} aria-hidden="true" />
                <span>{label}</span>
                {keys.some((key) => settings[key] !== applied[key]) && <span className="settings-change-dot" aria-hidden="true" />}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="settings-detail">
            <div ref={panelRef} className="settings-panels">
              {categories.map(({ id, title, icon: Icon }) => (
                <TabsContent key={id} value={id} className="settings-panel">
                  <div className="settings-section-heading" data-category={id}>
                    <span className="settings-section-icon"><Icon size={18} aria-hidden="true" /></span>
                    <h2>{title}</h2>
                  </div>

                  {id === "defaults" && <>
                    <SettingRow label={<span id={methodLabelId}>Split method</span>} description="Initial ownership allocation">
                      <ToggleGroup type="single" value={settings.defaultSplitMethod} onValueChange={(value) => { if (value === "Equal" || value === "Custom") update("defaultSplitMethod", value); }} aria-labelledby={methodLabelId} className="settings-method">
                        <ToggleGroupItem type="button" value="Equal">Equal</ToggleGroupItem>
                        <ToggleGroupItem type="button" value="Custom">Custom</ToggleGroupItem>
                      </ToggleGroup>
                    </SettingRow>
                    <SelectRow label="Default territory" value={settings.defaultTerritory} onValueChange={(value) => update("defaultTerritory", value)} options={["Worldwide", "United States", "North America", "Custom"]} />
                    <SelectRow label="Default role" value={settings.defaultUserRole} onValueChange={(value) => update("defaultUserRole", value)} options={CREATOR_ROLE_OPTIONS} />
                  </>}

                  {id === "notifications" && <>
                    <ToggleRow label="Signature emails" description="When a collaborator signs" checked={settings.emailOnSignature} onCheckedChange={(checked) => update("emailOnSignature", checked)} />
                    <ToggleRow label="Proposal emails" description="Changes to shares or agreement details" checked={settings.emailOnComment} onCheckedChange={(checked) => update("emailOnComment", checked)} />
                    <ToggleRow label="Remind unsigned parties" checked={settings.remindUnsignedParties} onCheckedChange={(checked) => update("remindUnsignedParties", checked)} />
                    <SelectRow label="Reminder timing" disabled={!settings.remindUnsignedParties} value={settings.reminderCadence} onValueChange={(value) => update("reminderCadence", value)} options={["Every day", "Every 3 days", "Weekly"]} />
                  </>}

                  {id === "privacy" && <>
                    <ToggleRow label="Hide contact details" description="Phone number and address in collaborator records" checked={settings.hideContactFromCollaborators} onCheckedChange={(checked) => update("hideContactFromCollaborators", checked)} />
                    <ToggleRow label="Approve external sharing" description="PROs, MLC, publishers and administrators" checked={settings.requireApprovalBeforeSharing} onCheckedChange={(checked) => update("requireApprovalBeforeSharing", checked)} />
                  </>}

                  {id === "documents" && <ToggleRow label="Include signature audit trail" description="Signing activity and version history in PDF exports" checked={settings.includeAuditTrail} onCheckedChange={(checked) => update("includeAuditTrail", checked)} />}
                </TabsContent>
              ))}
            </div>

            <footer className="settings-footer">
              <span role="status" className="settings-preview-status" data-applied={previewApplied}>
                {previewApplied && <Check size={14} aria-hidden="true" />}
                {changes.length ? `${changes.length} preview ${changes.length === 1 ? "change" : "changes"}` : previewApplied ? "Preview applied" : "No preview changes"}
              </span>
              <div className="settings-footer-actions">
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" disabled={!changes.length} aria-label="Discard preview changes" onClick={() => { setSettings(applied); setPreviewApplied(false); }}><RotateCcw /></Button>
                    </TooltipTrigger>
                    <TooltipContent>Discard preview changes</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button type="button" className="settings-apply" disabled={!changes.length} onClick={() => { setApplied(settings); setPreviewApplied(true); }}><Check />Apply preview</Button>
              </div>
            </footer>
          </div>
        </Tabs>
      </div>
    </section>
  );
}

function SettingRow({ label, description, children, disabled = false, toggle = false }: { label: ReactNode; description?: ReactNode; children: ReactNode; disabled?: boolean; toggle?: boolean }) {
  return (
    <div className="settings-row" data-disabled={disabled} data-toggle={toggle}>
      <div className="settings-row-copy"><div className="settings-row-label">{label}</div>{description && <div className="settings-row-description">{description}</div>}</div>
      <div className="settings-row-control">{children}</div>
    </div>
  );
}

function SelectRow({ label, value, onValueChange, options, disabled = false }: { label: string; value: string; onValueChange: (value: string) => void; options: readonly string[]; disabled?: boolean }) {
  const id = useId();
  return (
    <SettingRow label={<Label htmlFor={id}>{label}</Label>} disabled={disabled}>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger id={id}><SelectValue /></SelectTrigger>
        <SelectContent><SelectGroup>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectGroup></SelectContent>
      </Select>
    </SettingRow>
  );
}

function ToggleRow({ label, description, checked, onCheckedChange }: { label: string; description?: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  const id = useId();
  return (
    <SettingRow label={<Label htmlFor={id}>{label}</Label>} description={description && <span id={`${id}-description`}>{description}</span>} toggle>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} aria-describedby={description ? `${id}-description` : undefined} />
    </SettingRow>
  );
}
