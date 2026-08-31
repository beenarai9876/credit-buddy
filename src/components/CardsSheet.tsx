import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard as CardIcon, History, Plus, Trash2, Edit2, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  availableLimit,
  formatDate,
  inr,
  thirtyPct,
  utilization,
  toOrdinal,
  type CreditCard,
} from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RecordPaymentDialog } from "@/components/RecordPaymentDialog";
import { CardHistoryDialog } from "@/components/CardHistoryDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function CardsSheet({ cards }: { cards: CreditCard[] }) {
  const queryClient = useQueryClient();
  const [payCard, setPayCard] = useState<CreditCard | null>(null);
  const [historyCard, setHistoryCard] = useState<CreditCard | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteCard, setDeleteCard] = useState<CreditCard | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["credit_cards"] });

  const addCard = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("credit_cards")
        .insert({
          user_id: user.id,
          name: "New card",
          credit_limit: 0,
          bill_generation_day: 1,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      invalidate();
      if (data) {
        setEditingId(data.id);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<CreditCard>;
    }) => {
      const { error } = await supabase
        .from("credit_cards")
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
        .from("credit_cards")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e) => toast.error(e.message),
  });

  const totals = cards.reduce(
    (acc, c) => ({
      limit: acc.limit + c.credit_limit,
      used: acc.used + c.used_limit,
      bill: acc.bill + c.current_bill_amount,
    }),
    { limit: 0, used: 0, bill: 0 },
  );

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">
          Credit Card Sheet
        </h2>
        <Button size="sm" onClick={() => addCard.mutate()}>
          <Plus className="h-4 w-4" /> Add card
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50 text-center text-xs uppercase tracking-wide text-muted-foreground">
              <Th>Card Name</Th>
              <Th>Limit</Th>
              <Th>Bill Gen. Day</Th>
              <Th>Last Payment Day</Th>
              <Th>Used Limit</Th>
              <Th>Available</Th>
              <Th>Bill Amount</Th>
              <Th>30% of Limit</Th>
              <Th className="w-40">Usage</Th>
              <Th className="w-28" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
             {cards.map((c) => {
              const pct = utilization(c);
              const isEditing = editingId === c.id;
              return (
                <tr key={c.id} className="group">
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <Input
                        key={`${c.id}-n-${c.name}`}
                        defaultValue={c.name}
                        onBlur={(e) => {
                          if (e.target.value.trim() && e.target.value !== c.name)
                            update.mutate({
                              id: c.id,
                              patch: { name: e.target.value.trim() },
                            });
                        }}
                        className="h-8 w-40 bg-transparent text-sm font-medium focus:bg-secondary"
                        autoFocus
                      />
                    ) : (
                      <div className="h-8 flex items-center px-3 text-sm font-medium text-foreground">
                        {c.name}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <NumCell
                        value={c.credit_limit}
                        onCommit={(v) =>
                          update.mutate({ id: c.id, patch: { credit_limit: v } })
                        }
                      />
                    ) : (
                      <div className="h-8 flex items-center justify-end px-3 font-mono text-sm text-foreground">
                        {inr(c.credit_limit)}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <Input
                        key={`${c.id}-d-${c.bill_generation_day}`}
                        type="number"
                        min={1}
                        max={31}
                        defaultValue={c.bill_generation_day}
                        onBlur={(e) => {
                          const v = Math.round(Number(e.target.value));
                          if (v >= 1 && v <= 31 && v !== c.bill_generation_day)
                            update.mutate({
                              id: c.id,
                              patch: { bill_generation_day: v },
                            });
                        }}
                        className="h-8 w-16 bg-transparent text-center font-mono text-sm focus:bg-secondary"
                      />
                    ) : (
                      <div className="h-8 flex items-center justify-center font-mono text-sm text-foreground">
                        {toOrdinal(c.bill_generation_day)}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <Input
                        key={`${c.id}-lp-${c.last_payment_day}`}
                        type="number"
                        min={1}
                        max={31}
                        defaultValue={c.last_payment_day ?? ""}
                        onBlur={(e) => {
                          const v = e.target.value ? Math.round(Number(e.target.value)) : null;
                          if (v === null || (v >= 1 && v <= 31)) {
                            if (v !== c.last_payment_day) {
                              update.mutate({
                                id: c.id,
                                patch: {
                                  last_payment_day: v,
                                },
                              });
                            }
                          }
                        }}
                        className="h-8 w-16 bg-transparent text-center font-mono text-sm focus:bg-secondary"
                      />
                    ) : (
                      <div className="h-8 flex items-center justify-center font-mono text-sm text-foreground">
                        {c.last_payment_day ? toOrdinal(c.last_payment_day) : "-"}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <NumCell
                      value={c.used_limit}
                      onCommit={(v) =>
                        update.mutate({ id: c.id, patch: { used_limit: v } })
                      }
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-sm text-primary">
                    {inr(availableLimit(c))}
                  </td>
                  <td className="px-3 py-2">
                    <NumCell
                      value={c.current_bill_amount}
                      warn={c.current_bill_amount > 0}
                      onCommit={(v) =>
                        update.mutate({
                          id: c.id,
                          patch: { current_bill_amount: v },
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-sm text-muted-foreground">
                    {inr(thirtyPct(c))}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                        <div
                          className={
                            pct > 0.3
                              ? "h-full rounded-full bg-destructive transition-all"
                              : "h-full rounded-full bg-primary transition-all"
                          }
                          style={{ width: `${Math.round(pct * 100)}%` }}
                        />
                      </div>
                      <span className="w-10 text-right font-mono text-xs text-muted-foreground">
                        {Math.round(pct * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      {isEditing ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:text-primary-foreground hover:bg-primary"
                          title="Save"
                          onClick={() => setEditingId(null)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Edit"
                          onClick={() => setEditingId(c.id)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setPayCard(c)}
                      >
                        Pay
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        title="History"
                        onClick={() => setHistoryCard(c)}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteCard(c)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {cards.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  <CardIcon className="mx-auto mb-2 h-6 w-6 opacity-50" />
                  No cards yet — click “Add card” to start tracking.
                </td>
              </tr>
            )}
          </tbody>
          {cards.length > 0 && (
            <tfoot>
              <tr className="border-t border-border bg-secondary/40 font-mono text-sm">
                <td className="px-3 py-2.5 font-display font-semibold">
                  Totals
                </td>
                <td className="px-3 py-2.5 text-right">{inr(totals.limit)}</td>
                <td colSpan={2} />
                <td className="px-3 py-2.5 text-right">{inr(totals.used)}</td>
                <td className="px-3 py-2.5 text-right text-primary">
                  {inr(Math.max(totals.limit - totals.used, 0))}
                </td>
                <td className="px-3 py-2.5 text-right text-warning">
                  {inr(totals.bill)}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Tip: click any cell to edit — values save when you leave the field.
        Available limit and 30% are calculated automatically. Use “Pay” to log a
        bill payment; past records are kept under the history icon.
      </p>

      <RecordPaymentDialog
        card={payCard}
        open={!!payCard}
        onOpenChange={(o) => !o && setPayCard(null)}
      />
      <CardHistoryDialog
        card={historyCard}
        open={!!historyCard}
        onOpenChange={(o) => !o && setHistoryCard(null)}
      />

      <AlertDialog open={!!deleteCard} onOpenChange={(o) => !o && setDeleteCard(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the card{" "}
              <span className="font-semibold text-foreground">"{deleteCard?.name}"</span> and
              all its historical bill payment records from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteCard) {
                  remove.mutate(deleteCard.id);
                  setDeleteCard(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function Th({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={`px-3 py-2.5 font-medium ${className}`}>{children}</th>
  );
}

function NumCell({
  value,
  onCommit,
  warn,
}: {
  value: number;
  onCommit: (v: number) => void;
  warn?: boolean;
}) {
  return (
    <div className="flex justify-end">
      <Input
        key={`${value}`}
        type="number"
        min="0"
        step="0.01"
        defaultValue={value}
        onBlur={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v) && v !== value) onCommit(v);
        }}
        className={`h-8 w-28 bg-transparent text-right font-mono text-sm focus:bg-secondary ${
          warn ? "text-warning" : ""
        }`}
        title={inr(value)}
      />
    </div>
  );
}
