import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Landmark, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { inr, type WalletAccount } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WalletPanel({ accounts }: { accounts: WalletAccount[] }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"bank" | "cash">("bank");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["wallet_accounts"] });

  const addAccount = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("wallet_accounts")
        .insert({ name: name.trim(), kind, balance: 0, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateBalance = useMutation({
    mutationFn: async ({ id, balance }: { id: string; balance: number }) => {
      const { error } = await supabase
        .from("wallet_accounts")
        .update({ balance })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("wallet_accounts")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e) => toast.error(e.message),
  });

  const bankTotal = accounts
    .filter((a) => a.kind === "bank")
    .reduce((s, a) => s + a.balance, 0);
  const cashTotal = accounts
    .filter((a) => a.kind === "cash")
    .reduce((s, a) => s + a.balance, 0);

  return (
    <section>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Landmark className="h-4 w-4" />}
          label="In Bank"
          value={inr(bankTotal)}
        />
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          label="Cash in Wallet"
          value={inr(cashTotal)}
        />
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          label="Total Available Money"
          value={inr(bankTotal + cashTotal)}
          highlight
        />
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-display text-sm font-semibold">My Accounts</h3>
        </div>
        <ul className="divide-y divide-border">
          {accounts.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                {a.kind === "bank" ? (
                  <Landmark className="h-4 w-4" />
                ) : (
                  <Wallet className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.name}</p>
                <p className="text-xs capitalize text-muted-foreground">
                  {a.kind}
                </p>
              </div>
              <Input
                key={`${a.id}-${a.balance}`}
                type="number"
                defaultValue={a.balance}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v) && v !== a.balance)
                    updateBalance.mutate({ id: a.id, balance: v });
                }}
                className="h-8 w-32 bg-secondary text-right font-mono text-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => remove.mutate(a.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
          {accounts.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              No accounts yet — add your bank or cash below.
            </li>
          )}
        </ul>
        <form
          className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) addAccount.mutate();
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Account name (e.g. HDFC Savings)"
            className="h-9 min-w-48 flex-1 bg-secondary text-sm"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as "bank" | "cash")}
            className="h-9 rounded-md border border-input bg-secondary px-3 text-sm"
          >
            <option value="bank">Bank</option>
            <option value="cash">Cash</option>
          </select>
          <Button type="submit" size="sm" disabled={!name.trim()}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </form>
      </div>
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-xl border border-primary/40 bg-accent p-4"
          : "rounded-xl border border-border bg-card p-4"
      }
    >
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold tracking-tight">
        {value}
      </p>
    </div>
  );
}
