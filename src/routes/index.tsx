import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { LogOut, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { CreditCard, WalletAccount } from "@/lib/finance";
import { WalletPanel } from "@/components/WalletPanel";
import { CardsSheet } from "@/components/CardsSheet";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — LedgerLite" },
      {
        name: "description",
        content:
          "Your credit card sheet, bill history, and bank & cash balances at a glance.",
      },
      { property: "og:title", content: "Dashboard — LedgerLite" },
      {
        property: "og:description",
        content:
          "Your credit card sheet, bill history, and bank & cash balances at a glance.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const { session, loading, user } = useAuth();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  const { data: cards = [] } = useQuery({
    queryKey: ["credit_cards"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_cards")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as CreditCard[];
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["wallet_accounts"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_accounts")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as WalletAccount[];
    },
  });

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <h1 className="font-display text-base font-semibold leading-tight">
                LedgerLite
              </h1>
              <p className="text-xs text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8">
        <WalletPanel accounts={accounts} />
        <CardsSheet cards={cards} />
      </main>
    </div>
  );
}
