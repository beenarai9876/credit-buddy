import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Edit2, Check, X } from "lucide-react";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPeriod, setEditPeriod] = useState("");
  const [editBill, setEditBill] = useState("");
  const [editPaid, setEditPaid] = useState("");
  const [editDate, setEditDate] = useState("");

  const startEdit = (r: BillRecord) => {
    setEditingId(r.id);
    setEditPeriod(r.period_label);
    setEditBill(String(r.bill_amount));
    setEditPaid(String(r.amount_paid));
    setEditDate(r.payment_date || "");
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleSave = (id: string) => {
    const bill = Number(editBill) || 0;
    const paid = Number(editPaid) || 0;
    const status = paid >= bill && bill > 0 ? "paid" : paid > 0 ? "partial" : "unpaid";
    update.mutate({
      id,
      patch: {
        period_label: editPeriod,
        bill_amount: bill,
        amount_paid: paid,
        payment_date: editDate || null,
        status,
      },
    });
    setEditingId(null);
  };

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
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) setEditingId(null);
      onOpenChange(o);
    }}>
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
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 px-2 font-medium text-center">Period</th>
                  <th className="py-2 px-2 font-medium text-center">Bill</th>
                  <th className="py-2 px-2 font-medium text-center">Paid</th>
                  <th className="py-2 px-2 font-medium text-center">Date</th>
                  <th className="py-2 px-2 font-medium text-center">Status</th>
                  <th className="py-2 font-medium text-center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.map((r) => {
                  const isEditing = editingId === r.id;

                  const tempBill = isEditing ? (Number(editBill) || 0) : r.bill_amount;
                  const tempPaid = isEditing ? (Number(editPaid) || 0) : r.amount_paid;
                  const currentStatus = isEditing
                    ? (tempPaid >= tempBill && tempBill > 0 ? "paid" : tempPaid > 0 ? "partial" : "unpaid")
                    : r.status;

                  return (
                    <tr key={r.id}>
                      <td className="py-2 px-2 text-center">
                        {isEditing ? (
                          <Input
                            value={editPeriod}
                            onChange={(e) => setEditPeriod(e.target.value)}
                            className="h-8 w-24 bg-secondary text-xs text-center mx-auto"
                          />
                        ) : (
                          <span className="text-foreground text-xs font-medium">{r.period_label}</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editBill}
                            onChange={(e) => setEditBill(e.target.value)}
                            className="h-8 w-24 bg-secondary text-center font-mono text-xs mx-auto"
                          />
                        ) : (
                          <span className="font-mono text-xs text-foreground block text-center">
                            {inr(r.bill_amount)}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editPaid}
                            onChange={(e) => setEditPaid(e.target.value)}
                            className="h-8 w-24 bg-secondary text-center font-mono text-xs mx-auto"
                          />
                        ) : (
                          <span className="font-mono text-xs text-foreground block text-center">
                            {inr(r.amount_paid)}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="h-8 w-35 bg-secondary text-xs text-center mx-auto"
                          />
                        ) : (
                          <span className="text-xs text-foreground block text-center">
                            {formatDate(r.payment_date)}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <Badge
                          variant={
                            currentStatus === "paid"
                              ? "default"
                              : currentStatus === "partial"
                                ? "secondary"
                                : "outline"
                          }
                          className="capitalize text-[10px] px-1.5 py-0.5"
                        >
                          {currentStatus}
                        </Badge>
                      </td>
                      <td className="py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary hover:text-primary-foreground hover:bg-primary"
                                title="Save"
                                onClick={() => handleSave(r.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                title="Cancel"
                                onClick={handleCancel}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                title="Edit"
                                onClick={() => startEdit(r)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                title="Delete"
                                onClick={() => remove.mutate(r.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
