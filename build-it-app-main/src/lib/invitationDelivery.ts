import { supabase } from "@/integrations/supabase/client";
import { reportFailure } from "@/lib/monitoring";

export type InvitationDelivery = {
  id: string | null; partyId: string; name: string; status: string | null; updatedAt: string | null; canRetry: boolean; reason: string | null;
};
const states: Record<string, { label: string; detail: string; problem?: boolean }> = {
  queued: { label: "Queued", detail: "Waiting for the email service. Temporary failures are retried automatically." },
  processing: { label: "Sending", detail: "The email service is processing this invitation." },
  sent: { label: "Sent", detail: "Accepted by the email service. Delivery has not been confirmed." },
  delivered: { label: "Delivered", detail: "Accepted by the recipient's mail server. This does not confirm that it was read." },
  delivery_delayed: { label: "Delayed", detail: "The recipient's mail server has delayed delivery." },
  bounced: { label: "Bounced", detail: "The recipient's mail server rejected the email. Check the address before inviting again.", problem: true },
  complained: { label: "Stopped", detail: "The recipient reported the email as spam. Do not resend.", problem: true },
  suppressed: { label: "Blocked", detail: "The email provider has stopped delivery to this address.", problem: true },
  failed: { label: "Failed", detail: "Delivery could not be completed. Contact SPLIT if retry is unavailable.", problem: true },
  waiting_address: { label: "Waiting for account", detail: "This username needs an account with a confirmed email." },
  skipped: { label: "Not sent", detail: "The email was not sent. The in-app invitation is separate." },
};
export function deliveryPresentation(row: InvitationDelivery) {
  if (row.reason === "limit") return { label: "Not sent", detail: "The invitation email limit was reached. Contact SPLIT.", problem: true };
  if (row.reason === "unavailable") return { label: "No email found", detail: "No confirmed recipient email was available. Use their email address in a new invitation.", problem: true };
  if (row.status === "failed" && row.reason === "review") return { label: "Needs review", detail: "Delivery is uncertain. Contact SPLIT before sending another email.", problem: true };
  return states[row.status ?? ""] ?? { label: "No email record", detail: "No email was queued for this invitation." };
}

export function canRetryInvitationDelivery(row: InvitationDelivery) {
  return Boolean(row.id && row.canRetry && row.status === "failed" && !row.reason);
}

async function requireCreatorSession(userId: string) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !userId || data.user?.id !== userId) throw new Error("Your account changed. Sign in again.");
}
export async function loadInvitationDelivery(userId: string, splitId: string): Promise<InvitationDelivery[] | null> {
  try {
    await requireCreatorSession(userId);
    const { data, error } = await supabase.rpc("load_split_invitation_delivery", { p_split_sheet_id: splitId });
    // A preview can run before the optional delivery-tracking migration is deployed.
    if (error?.code === "PGRST202") return null;
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("Invalid email status response.");
    await requireCreatorSession(userId);
    return data as unknown as InvitationDelivery[];
  } catch (cause) {
    reportFailure("invitation_status_failure", cause);
    throw new Error("Email status could not be refreshed.");
  }
}
export async function retryInvitationEmail(userId: string, jobId: string) {
  try {
    await requireCreatorSession(userId);
    const { data, error } = await supabase.rpc("retry_split_invitation_email", { p_job_id: jobId });
    if (error) throw error;
    if (data !== true) throw new Error("Retry was not queued.");
  } catch (cause) {
    reportFailure("invitation_retry_failure", cause);
    throw new Error("This email could not be safely retried. Refresh its status or contact SPLIT.");
  }
}
