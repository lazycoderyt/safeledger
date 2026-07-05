import { Receipt } from "lucide-react";

export default function AdminTransactionsPage() {
  return (
    <div className="mx-auto max-w-4xl bg-white p-6 sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        All Transactions
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Review, edit, and correct transaction records across every user.
      </p>
      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <Receipt
          className="mx-auto h-8 w-8 text-slate-300"
          aria-hidden="true"
        />
        <p className="mt-3 text-sm font-medium text-slate-600">Coming next</p>
        <p className="mt-1 text-xs text-slate-400">
          Transaction editing tools are being built in the next pass.
        </p>
      </div>
    </div>
  );
}
