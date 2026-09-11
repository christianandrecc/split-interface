import { useEffect, useState, type ComponentProps } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import ContractBuilder from "./ContractBuilder";
import { Button } from "@/components/ui/button";
import { DEFAULT_APP_SETTINGS, loadAccountSettings, type AppSettings } from "@/lib/accountSettings";

type Props = Omit<ComponentProps<typeof ContractBuilder>, "settings"> & { accountId?: string | null };

export default function AccountContractBuilder(props: Props) {
  const accountId = props.accountId ?? props.userProfile.authUserId;
  return <LoadedBuilder key={`${accountId ?? "local"}:${props.initialDocument?.id ?? "new"}`} {...props} accountId={accountId} />;
}

function LoadedBuilder({ accountId, ...props }: Props) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const isDraft = Boolean(props.initialDocument);
  useEffect(() => {
    if (isDraft || !accountId) return;
    let cancelled = false;
    setError("");
    loadAccountSettings(accountId).then((result) => { if (!cancelled) setSettings(result.settings); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Could not load split defaults."); });
    return () => { cancelled = true; };
  }, [accountId, isDraft, attempt]);

  // Existing drafts keep their own fields; local-only sessions use local defaults.
  if (isDraft || !accountId || settings) return <ContractBuilder {...props} settings={settings ?? DEFAULT_APP_SETTINGS} />;
  return <main className="mx-auto max-w-4xl space-y-4 px-6 py-8">
    <h1 className="text-xl font-semibold">New SPLIT</h1>
    {error ? <p role="alert">{error}</p> : <p role="status">Loading split defaults...</p>}
    <div className="flex gap-3">
      <Button type="button" variant="outline" onClick={props.onBack}><ArrowLeft />Cancel</Button>
      {error && <Button type="button" onClick={() => setAttempt((value) => value + 1)}><RotateCcw />Retry</Button>}
    </div>
  </main>;
}
