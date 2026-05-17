import { Card, SectionTitle } from "@/components/Cards";

export default function AdminPanel() {
  return (
    <main className="mx-auto min-h-screen max-w-md bg-slate-50 p-4">
      <SectionTitle eyebrow="Secure" title="Admin Panel" />
      <Card className="mt-4">
        <h2 className="font-black">Override final score</h2>
        <form className="mt-4 space-y-3">
          <input className="w-full rounded-2xl border border-slate-200 p-3" placeholder="Match ID" type="number" />
          <div className="grid grid-cols-2 gap-3">
            <input className="rounded-2xl border border-slate-200 p-3" placeholder="Home" type="number" />
            <input className="rounded-2xl border border-slate-200 p-3" placeholder="Away" type="number" />
          </div>
          <button className="w-full rounded-2xl bg-red-600 py-3 font-black text-white">Save override</button>
        </form>
      </Card>
      <Card className="mt-4">
        <h2 className="font-black">Recalculate match points</h2>
        <p className="mt-1 text-sm text-slate-500">Wipes prediction awards for the match and rebuilds user totals from the scoring engine.</p>
        <button className="mt-4 w-full rounded-2xl bg-navy py-3 font-black text-white">Wipe & recalculate</button>
      </Card>
    </main>
  );
}
