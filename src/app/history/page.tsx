import { HistoryClient } from "@/components/history-client";

export default function HistoryPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
      <section className="space-y-4">
        <h1 className="font-[family-name:var(--font-serif)] text-4xl text-slate-900">
          {"\u{1F4CB}"} Symptom History
        </h1>
        <p className="max-w-3xl text-base leading-7 text-slate-600">
          Your past triage sessions stored locally on this device.
        </p>
      </section>
      <HistoryClient />
    </div>
  );
}
