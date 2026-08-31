import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { CreditCard } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function RecordPaymentDialog({
  card,
  open,
  onOpenChange,
}: {
  card: CreditCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentDate, setPaymentDate] = useState("");

  useEffect(() => {
    if (open && card) {
      const now = new Date();
      setPeriod(
        now.toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
      );
      setBillAmount(String(card.current_bill_amount || ""));
      setAmountPaid(String(card.current_bill_amount || ""));
      setPaymentDate(now.toISOString().slice(0, 10));
    }
  }, [open, card]);

  const save = useMutation({
    mutationFn: async () => {
      if (!card) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const bill = Number(billAmount) || 0;
      const paid = Number(amountPaid) || 0;
      const status = paid >= bill && bill > 0 ? "paid" : paid > 0 ? "partial" : "unpaid";
      const { error } = await supabase.from("card_bill_records").insert({
        card_id: card.id,
        user_id: user.id,
        period_label: period,
        bill_amount: bill,
        amount_paid: paid,
        payment_date: paymentDate || null,
        status,
      });
      if (error) throw error;
      const { error: uerr } = await supabase
        .from("credit_cards")
        .update({
          current_bill_amount: Math.max(bill - paid, 0),
        })
        .eq("id", card.id);
      if (uerr) throw uerr;
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      queryClient.invalidateQueries({ queryKey: ["credit_cards"] });
      queryClient.invalidateQueries({ queryKey: ["card_bill_records"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="bg-card">
        <DialogHeader>
          <DialogTitle className="font-display">
            Record payment — {card?.name}
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="space-y-2">
            <Label>Billing period</Label>
            <Input
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="Aug 2026"
              className="bg-secondary"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Bill amount (₹)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={billAmount}
                disabled
                className="bg-secondary font-mono opacity-70 cursor-not-allowed"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Amount paid (₹)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="bg-secondary font-mono"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Payment date</Label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="bg-secondary"
            />
          </div>
          <Button type="submit" className="w-full" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save record"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
