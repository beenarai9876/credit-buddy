import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, inr, type BillRecord, type CreditCard } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CardHistoryDialog({
  card,
  open,
  onOpenChange,
}: {
  card: CreditCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const { data: records = [] } = useQuery({
    queryKey: ["card_bill_records", card?.id],
    enabled: open && !!card,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_bill_records")
        .select("*")
        .eq("card_id", card!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as BillRecord[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["card_bill_records"] });
    queryClient.invalidateQueries({ queryKey: ["credit_cards"] });
  };

  const update = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<BillRecord>;
    }) => {
      const { error } = await supabase
        .from("card_bill_records")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("card_bill_records")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card">
        <DialogHeader>
          <DialogTitle className="font-display">
            Payment history — {card?.name}
          </DialogTitle>
        </DialogHeader>
        {records.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No past records yet. Record a payment to start the history.
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">Period</th>
                  <th className="py-2 pr-2 font-medium">Bill</th>
                  <th className="py-2 pr-2 font-medium">Paid</th>
                  <th className="py-2 pr-2 font-medium">Date</th>
                  <th className="py-2 pr-2 font-medium">Status</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 pr-2">
                      <Input
                        key={`${r.id}-p-${r.period_label}`}
                        defaultValue={r.period_label}
                        onBlur={(e) => {
                          if (e.target.value !== r.period_label)
                            update.mutate({
                              id: r.id,
                              patch: { period_label: e.target.value },
                            });
                        }}
                        className="h-8 w-24 bg-secondary text-xs"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        key={`${r.id}-b-${r.bill_amount}`}
                        type="number"
                        defaultValue={r.bill_amount}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (Number.isFinite(v) && v !== r.bill_amount)
                            update.mutate({ id: r.id, patch: { bill_amount: v } });
                        }}
                        className="h-8 w-24 bg-secondary text-right font-mono text-xs"
                        title={inr(r.bill_amount)}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        key={`${r.id}-a-${r.amount_paid}`}
                        type="number"
                        defaultValue={r.amount_paid}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (Number.isFinite(v) && v !== r.amount_paid)
                            update.mutate({
                              id: r.id,
                              patch: {
                                amount_paid: v,
                                status:
                                  v >= r.bill_amount && r.bill_amount > 0
                                    ? "paid"
                                    : v > 0
                                      ? "partial"
                                      : "unpaid",
                              },
                            });
                        }}
                        className="h-8 w-24 bg-secondary text-right font-mono text-xs"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        key={`${r.id}-d-${r.payment_date}`}
                        type="date"
                        defaultValue={r.payment_date ?? ""}
                        onBlur={(e) => {
                          if (e.target.value !== (r.payment_date ?? ""))
                            update.mutate({
                              id: r.id,
                              patch: { payment_date: e.target.value || null },
                            });
                        }}
                        className="h-8 w-36 bg-secondary text-xs"
                        title={formatDate(r.payment_date)}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Badge
                        variant={
                          r.status === "paid"
                            ? "default"
                            : r.status === "partial"
                              ? "secondary"
                              : "outline"
                        }
                        className="capitalize"
                      >
                        {r.status}
                      </Badge>
                    </td>
                    <td className="py-2 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => remove.mutate(r.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
