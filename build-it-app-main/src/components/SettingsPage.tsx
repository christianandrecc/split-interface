import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Bell, Check, FileText, Loader2, Lock, RotateCcw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useContentEntrance } from "@/hooks/use-content-entrance";
import { useIsMobile } from "@/hooks/use-mobile";
import { ROLE_OPTIONS } from "@/components/contract-builder/types";
import { Input } from "@/components/ui/input";
import { DEFAULT_APP_SETTINGS, loadAccountSettings, saveAccountSettings, type AppSettings, type SavedSettings } from "@/lib/accountSettings";
import type { UserProfile } from "@/lib/userProfile";
import AccountClosureRequest from "@/components/AccountClosureRequest";
import "./settings.css";

const categories = [
  { id: "defaults", label: "Split defaults", title: "Split sheet defaults", icon: Settings2, keys: ["defaultSplitMethod", "defaultTerritory", "defaultUserRole"] },
  { id: "notifications", label: "Notifications", title: "Notifications", icon: Bell, keys: [] },
  { id: "privacy", label: "Privacy & sharing", title: "Privacy & sharing", icon: Lock, keys: [] },
  { id: "documents", label: "Documents", title: "Document preferences", icon: FileText, keys: ["includeAuditTrail"] },
] as const;

type SettingsPageProps = { userProfile: UserProfile; onViewOnboardingAgain?: () => void };

export default function SettingsPage({ userProfile, onViewOnboardingAgain }: SettingsPageProps) {
  return <AccountSettings key={userProfile.authUserId || userProfile.splitId} userProfile={userProfile} onViewOnboardingAgain={onViewOnboardingAgain} />;
}

function AccountSettings({ userProfile, onViewOnboardingAgain }: SettingsPageProps) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [applied, setApplied] = useState<SavedSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const alive = useRef(false);
  const inFlight = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    loadAccountSettings(userProfile.authUserId ?? "").then((result) => {
      if (!cancelled) { setSettings(result.settings); setApplied(result); setSaved(false); }
    }).catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Could not load settings."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userProfile.authUserId, reload]);
  const [category, setCategory] = useState("defaults");
  const isMobile = useIsMobile();
  const panelRef = useContentEntrance<HTMLDivElement>(category);
  const methodLabelId = useId();
  const territoryId = useId();
  const onboardingHintId = useId();
  const territories = ["Worldwide", "United States", "North America"];
  const changes = applied ? (Object.keys(settings) as (keyof AppSettings)[]).filter((key) => settings[key] !== applied.settings[key]) : [];
  const disabled = loading || saving || !applied;
  useEffect(() => {
    if (!changes.length) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changes.length]);

  const update = <Key extends keyof AppSettings>(key: Key, value: AppSettings[Key]) => {
    setSaved(false);
    setSettings((current) => ({ ...current, [key]: value }));
  };
  const save = async () => {
    if (inFlight.current || disabled || !changes.length) return;
    inFlight.current = true;
    setSaving(true); setError("");
    try {
      const result = await saveAccountSettings(userProfile.authUserId ?? "", settings, applied.revision);
      if (alive.current) { setSettings(result.settings); setApplied(result); setSaved(true); }
    } catch (err) {
      if (alive.current) setError(err instanceof Error ? err.message : "Could not save settings. Your changes are still here.");
    } finally {
      inFlight.current = false;
      if (alive.current) setSaving(false);
    }
  };

  return (
    <section className="settings-page" aria-label="Settings" aria-busy={loading || saving}>
      <div className="settings-shell">
        <header className="settings-heading">
          <h1>Settings</h1>
          {onViewOnboardingAgain && (
            <span className="settings-onboarding" title={changes.length ? "Save or discard your changes first" : undefined}>
              <Button type="button" variant="outline" onClick={onViewOnboardingAgain} disabled={saving || changes.length > 0}
                aria-describedby={changes.length ? onboardingHintId : undefined}>
                <RotateCcw size={16} aria-hidden="true" />View onboarding again
              </Button>
              {changes.length > 0 && <span id={onboardingHintId} className="sr-only">Save or discard your changes first.</span>}
            </span>
          )}
        </header>

        <Tabs value={category} onValueChange={setCategory} orientation={isMobile ? "horizontal" : "vertical"} className="settings-layout">
          <TabsList className="settings-navigation" aria-label="Settings categories">
            {categories.map(({ id, label, icon: Icon, keys }) => (
              <TabsTrigger key={id} value={id} className="settings-nav-item" aria-label={label} aria-description={keys.some((key) => changes.includes(key)) ? "Unsaved changes" : undefined}>
                <Icon size={17} aria-hidden="true" />
                <span>{label}</span>
                {keys.some((key) => changes.includes(key)) && <span className="settings-change-dot" aria-hidden="true" />}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="settings-detail">
            {error && <div className="mb-4 text-sm" role="alert"><p>{error}</p><Button type="button" variant="outline" className="mt-2" disabled={saving || loading} onClick={() => setReload((value) => value + 1)}><RotateCcw />{applied ? "Reload saved settings" : "Retry loading settings"}</Button></div>}
            {loading && <p role="status" className="mb-4 text-sm text-muted-foreground">Loading settings...</p>}
            <fieldset disabled={disabled} className="min-w-0">
            <div ref={panelRef} className="settings-panels">
              {categories.map(({ id, title, icon: Icon }) => (
                <TabsContent key={id} value={id} className="settings-panel">
                  <div className="settings-section-heading" data-category={id}>
                    <span className="settings-section-icon"><Icon size={18} aria-hidden="true" /></span>
                    <h2>{title}</h2>
                  </div>

                  {id === "defaults" && <>
                    <SettingRow label={<span id={methodLabelId}>Split method</span>} description="Initial ownership allocation">
                      <ToggleGroup type="single" disabled={disabled} value={settings.defaultSplitMethod} onValueChange={(value) => { if (value === "Equal" || value === "Custom") update("defaultSplitMethod", value); }} aria-labelledby={methodLabelId} className="settings-method">
                        <ToggleGroupItem type="button" value="Equal">Equal</ToggleGroupItem>
                        <ToggleGroupItem type="button" value="Custom">Custom</ToggleGroupItem>
                      </ToggleGroup>
                    </SettingRow>
                    <SelectRow label="Default society territory" disabled={disabled} value={territories.includes(settings.defaultTerritory) ? settings.defaultTerritory : "Custom"} onValueChange={(value) => update("defaultTerritory", value === "Custom" ? "" : value)} options={[...territories, "Custom"]} />
                    {!territories.includes(settings.defaultTerritory) && <SettingRow label={<Label htmlFor={territoryId}>Society territory</Label>}><Input id={territoryId} maxLength={100} value={settings.defaultTerritory} onChange={(event) => update("defaultTerritory", event.target.value)} /></SettingRow>}
                    <SelectRow label="Default composition role" className="settings-composition-role" disabled={disabled} value={settings.defaultUserRole} onValueChange={(value) => update("defaultUserRole", value as AppSettings["defaultUserRole"])} options={ROLE_OPTIONS} />
                  </>}

                  {id === "notifications" && <>
                    <ToggleRow label="Signature emails" description="Unavailable: email delivery is not connected" checked={false} disabled />
                    <ToggleRow label="Proposal emails" description="Unavailable: email delivery is not connected" checked={false} disabled />
                    <ToggleRow label="Remind unsigned parties" description="Unavailable: scheduled reminders are not connected" checked={false} disabled />
                  </>}

                  {id === "privacy" && <>
                    <ToggleRow label="Hide contact details" description="Phone numbers and addresses stay private during beta" checked disabled />
                    <ToggleRow label="Approve external sharing" description="Unavailable: external delivery is not connected" checked disabled />
                  </>}

                  {id === "documents" && <ToggleRow label="Include signature audit trail" description="Signing activity and version history in your PDF exports. Signatures are always included." checked={settings.includeAuditTrail} disabled={disabled} onCheckedChange={(checked) => update("includeAuditTrail", checked)} />}
                </TabsContent>
              ))}
            </div>
            </fieldset>

            {category === "privacy" && <AccountClosureRequest />}

            <footer className="settings-footer">
              <span role={loading ? undefined : "status"} className="settings-save-status" data-applied={saved}>
                {saved && <Check size={14} aria-hidden="true" />}
                {saving ? "Saving..." : changes.length ? "Unsaved changes" : saved ? "Saved" : applied ? "No changes" : ""}
              </span>
              <div className="settings-footer-actions">
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" disabled={disabled || !changes.length} aria-label="Discard changes" onClick={() => { if (applied) setSettings(applied.settings); setSaved(false); setError(""); }}><RotateCcw /></Button>
                    </TooltipTrigger>
                    <TooltipContent>Discard changes</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button type="button" className="settings-apply" disabled={disabled || !changes.length} onClick={save}>{saving ? <Loader2 className="animate-spin" /> : <Check />}Save changes</Button>
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

function SelectRow({ label, value, onValueChange, options, disabled = false, className }: { label: string; value: string; onValueChange: (value: string) => void; options: readonly string[]; disabled?: boolean; className?: string }) {
  const id = useId();
  return (
    <SettingRow label={<Label htmlFor={id}>{label}</Label>} disabled={disabled}>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger id={id} className={className}><SelectValue /></SelectTrigger>
        <SelectContent><SelectGroup>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectGroup></SelectContent>
      </Select>
    </SettingRow>
  );
}

function ToggleRow({ label, description, checked, onCheckedChange, disabled = false }: { label: string; description?: string; checked: boolean; onCheckedChange?: (checked: boolean) => void; disabled?: boolean }) {
  const id = useId();
  return (
    <SettingRow label={<Label htmlFor={id}>{label}</Label>} description={description && <span id={`${id}-description`}>{description}</span>} toggle>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} aria-describedby={description ? `${id}-description` : undefined} />
    </SettingRow>
  );
}
