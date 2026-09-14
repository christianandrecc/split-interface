import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const supportEmail = "xtiancarrera@gmail.com";
const closureEmail = `mailto:${supportEmail}?${new URLSearchParams({
  subject: "SPLIT account closure request",
  body: "Hello, I would like to request closure of my SPLIT account. Please explain the next steps and which records will be retained before making any changes.",
}).toString().replace(/\+/g, "%20")}`;

export default function AccountClosureRequest() {
  return (
    <section className="mt-6 border-t pt-5" aria-labelledby="account-closure-heading">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1 basis-56">
          <h2 id="account-closure-heading" className="text-base font-semibold">Account closure</h2>
          <p className="mt-1 text-sm text-muted-foreground">Manually reviewed during beta. Signed split records are preserved.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild><Button type="button" variant="outline"><Mail size={16} aria-hidden="true" />Request account closure</Button></DialogTrigger>
          <DialogContent className="max-w-[calc(100%-2rem)] rounded-lg sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Request account closure</DialogTitle>
              <DialogDescription>This opens an email to SPLIT support. Your account stays active until your request is reviewed and closure is confirmed.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <p>Send the request from your current sign-in email. Never include your password or a confirmation link.</p>
              <p>Signed agreements, signatures and shared audit evidence are preserved. Other personal data will be reviewed separately; this is not an automatic deletion request.</p>
              <a href={closureEmail} className="break-all text-primary underline underline-offset-4">{supportEmail}</a>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button asChild><a href={closureEmail}><Mail size={16} aria-hidden="true" />Open email</a></Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
