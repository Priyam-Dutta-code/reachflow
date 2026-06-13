"use client";

/** Floating feedback widget (Phase 9). One textarea → /api/feedback, which
 * stores the row and emails the operator. Available app-wide via the shell. */
import { MessageSquare } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { track } from "@/lib/analytics";
import { apiFetch } from "@/lib/auth-client";

export function FeedbackWidget() {
  const pathname = usePathname();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (message.trim().length < 3) {
      toast("Add a little more detail first.", "error");
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/api/feedback", {
        method: "POST",
        body: JSON.stringify({ message: message.trim(), page: pathname }),
      });
      track("feedback_sent", { page: pathname });
      toast("Thanks — your note reached us.", "success");
      setMessage("");
      setOpen(false);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not send.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        className="fixed bottom-4 right-4 z-30 inline-flex h-11 items-center gap-2 rounded-control border border-line bg-surface px-4 text-sm font-medium text-ink-soft shadow-pop transition-colors hover:border-accent/30 hover:text-ink"
      >
        <MessageSquare className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Send feedback"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={busy} onClick={() => void submit()}>Send</Button>
          </>
        }
      >
        <p className="mb-3 text-sm leading-6 text-muted">
          Bugs, ideas, friction — anything. It goes straight to the person building ReachFlow.
        </p>
        <Textarea
          aria-label="Your feedback"
          placeholder="What's on your mind?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          maxLength={2000}
        />
      </Modal>
    </>
  );
}
