import { TriageForm } from "@/components/triage-form";

export default function TriagePage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
      <section className="space-y-3">
        <h1 className="font-[family-name:var(--font-serif)] text-4xl text-slate-900">
          Symptom Check
        </h1>
        <p className="max-w-3xl text-base leading-7 text-slate-600">
          Describe your symptoms and get an instant urgency assessment.
        </p>
      </section>

      <div className="rounded-3xl border border-brand-200 bg-brand-50 px-5 py-4 text-sm leading-6 text-brand-800">
        {"\u2139\uFE0F"} Important: This tool provides urgency guidance only -
        it is not a medical diagnosis.
      </div>

      <TriageForm />
    </div>
  );
}
