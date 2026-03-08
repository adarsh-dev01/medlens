import { MapExplorer } from "@/components/map-explorer";

export default function MapPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
      <section className="space-y-4">
        <h1 className="font-[family-name:var(--font-serif)] text-4xl text-slate-900">
          {"\u{1F4CD}"} Find Nearby Healthcare
        </h1>
        <p className="max-w-3xl text-base leading-7 text-slate-600">
          Locate the nearest clinics, hospitals, and pharmacies.
        </p>
      </section>
      <MapExplorer />
    </div>
  );
}
