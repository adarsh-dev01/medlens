"use client";

import Link from "next/link";
import {
  GoogleMap,
  InfoWindowF,
  MarkerF,
  useJsApiLoader
} from "@react-google-maps/api";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

import { useGeolocation } from "@/hooks/useGeolocation";
import type { Clinic } from "@/lib/types";
import { cn } from "@/lib/utils";

type FacilityType = "hospital" | "doctor" | "pharmacy";

type ClinicsResponse = {
  results: Clinic[];
  fallback_used: boolean;
  telemedicine_options: Array<{ name: string; url: string }>;
  message?: string | null;
};

const facilityOptions: Array<{
  value: FacilityType;
  label: string;
  icon: string;
  countLabel: string;
}> = [
  { value: "hospital", label: "Hospitals", icon: "\u{1F3E5}", countLabel: "hospitals" },
  { value: "doctor", label: "Clinics", icon: "\u{1F468}\u200D\u2695\uFE0F", countLabel: "clinics" },
  { value: "pharmacy", label: "Pharmacies", icon: "\u{1F48A}", countLabel: "pharmacies" }
];

const fallbackCenter = {
  lat: 37.7749,
  lng: -122.4194
};

const googleLibraries: ("places")[] = ["places"];

const mapContainerStyle = {
  width: "100%",
  height: "500px"
};

function LoadingSidebar() {
  return (
    <div className="space-y-3">
      <div className="skeleton h-24 w-full" />
      <div className="skeleton h-24 w-full" />
      <div className="skeleton h-24 w-full" />
    </div>
  );
}

function MapSkeleton() {
  return <div className="skeleton h-[500px] w-full rounded-[1.75rem]" />;
}

type GoogleMapPanelProps = {
  center: { lat: number; lng: number };
  clinics: Clinic[];
  selectedClinic: Clinic | null;
  hasUserLocation: boolean;
  onSelectClinic: (id: string | null) => void;
  apiKey: string;
};

function GoogleMapPanel({
  center,
  clinics,
  selectedClinic,
  hasUserLocation,
  onSelectClinic,
  apiKey
}: GoogleMapPanelProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "medlens-google-map",
    googleMapsApiKey: apiKey,
    libraries: googleLibraries
  });

  if (loadError) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-[1.75rem] bg-slate-100 px-6 text-center text-sm text-slate-600">
        Map could not be loaded right now. The nearby facilities list is still available.
      </div>
    );
  }

  if (!isLoaded) {
    return <MapSkeleton />;
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={selectedClinic ? { lat: selectedClinic.lat, lng: selectedClinic.lng } : center}
      zoom={selectedClinic ? 12 : 11}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false
      }}
    >
      {hasUserLocation ? (
        <MarkerF
          position={center}
          title="Your location"
          icon={{
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: "#1597f3",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
            scale: 8
          }}
        />
      ) : null}

      {clinics.length
        ? clinics.map((clinic) => (
            <MarkerF
              key={clinic.place_id}
              position={{ lat: clinic.lat, lng: clinic.lng }}
              title={clinic.name}
              onClick={() => onSelectClinic(clinic.place_id)}
            />
          ))
        : null}

      {selectedClinic ? (
        <InfoWindowF
          position={{ lat: selectedClinic.lat, lng: selectedClinic.lng }}
          onCloseClick={() => onSelectClinic(null)}
        >
          <div className="max-w-xs space-y-2 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">{selectedClinic.name}</p>
            <p>{selectedClinic.address}</p>
            <p>{selectedClinic.distance_km.toFixed(1)} km away</p>
            {selectedClinic.rating ? <p>{"\u2B50"} {selectedClinic.rating.toFixed(1)}</p> : null}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedClinic.lat},${selectedClinic.lng}`}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-brand-700 underline"
            >
              Get Directions -&gt;
            </a>
          </div>
        </InfoWindowF>
      ) : null}
    </GoogleMap>
  );
}

export function MapExplorer() {
  const { latitude, longitude, error, loading: locationLoading } = useGeolocation();
  const [facilityType, setFacilityType] = useState<FacilityType>("hospital");
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [telemedicineOptions, setTelemedicineOptions] = useState<ClinicsResponse["telemedicine_options"]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const shouldLoadMap = Boolean(apiKey);
  const hasUserLocation = latitude !== null && longitude !== null;

  const center = useMemo(
    () => ({
      lat: latitude ?? fallbackCenter.lat,
      lng: longitude ?? fallbackCenter.lng
    }),
    [latitude, longitude]
  );

  useEffect(() => {
    const controller = new AbortController();

    async function fetchClinics() {
      setLoading(true);
      setFetchError(null);

      try {
        const params = new URLSearchParams({
          lat: String(center.lat),
          lng: String(center.lng),
          type: facilityType,
          radius: "25000"
        });

        const response = await fetch(`/api/clinics?${params.toString()}`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error();
        }

        const data = (await response.json()) as ClinicsResponse;
        setClinics(data.results);
        setTelemedicineOptions(data.telemedicine_options);
        setFallbackUsed(data.fallback_used);
        setSelectedClinicId(data.results[0]?.place_id ?? null);
        setFetchError(data.message ?? null);
      } catch (caughtError) {
        if ((caughtError as Error).name === "AbortError") {
          return;
        }

        setClinics([]);
        setTelemedicineOptions([]);
        setFallbackUsed(true);
        setSelectedClinicId(null);
        setFetchError(
          "We could not load nearby facilities right now. If this is urgent, call 911 or seek emergency care immediately."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchClinics();
    return () => controller.abort();
  }, [center.lat, center.lng, facilityType]);

  const selectedClinic = clinics.find((clinic) => clinic.place_id === selectedClinicId) ?? null;
  const activeFacility = facilityOptions.find((option) => option.value === facilityType) ?? facilityOptions[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        {facilityOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-label={`Show nearby ${option.label.toLowerCase()}`}
            onClick={() => setFacilityType(option.value)}
            className={cn(
              "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
              facilityType === option.value
                ? "bg-brand-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            <span>{option.icon}</span>
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      {locationLoading ? (
        <div className="rounded-3xl border border-brand-200 bg-brand-50 px-5 py-4 text-sm text-brand-800">
          {"\u{1F4E1}"} Getting your location...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-3xl border border-yellow-200 bg-yellow-50 px-5 py-4 text-sm text-yellow-900">
          {error}
        </div>
      ) : null}

      {fetchError ? (
        <div className="rounded-3xl border border-yellow-200 bg-yellow-50 px-5 py-4 text-sm text-yellow-900">
          {fetchError}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr] lg:items-start">
        <div className="panel-strong p-3">
          {shouldLoadMap ? (
            <GoogleMapPanel
              center={center}
              clinics={clinics}
              selectedClinic={selectedClinic}
              hasUserLocation={hasUserLocation}
              onSelectClinic={setSelectedClinicId}
              apiKey={apiKey}
            />
          ) : (
            <div className="flex h-[500px] items-center justify-center rounded-[1.75rem] bg-slate-100 px-6 text-center text-sm text-slate-600">
              Map preview unavailable. The nearby facilities list is still available below.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="panel-strong">
            <h2 className="text-lg font-semibold text-slate-900">
              {clinics.length} {activeFacility.countLabel} found
            </h2>
          </div>

          {loading ? <LoadingSidebar /> : null}

          {!loading && fallbackUsed ? (
            <div className="panel-strong space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  {"\u{1F310}"} Telemedicine Options
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  No nearby facilities found. Try these remote options:
                </p>
              </div>
              <div className="space-y-3">
                {telemedicineOptions.map((option) => (
                  <a
                    key={option.name}
                    href={option.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-3xl border border-brand-200 bg-brand-50 px-4 py-4 text-sm font-semibold text-brand-800 transition-colors duration-200 hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                  >
                    {option.name}
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {!loading && !fallbackUsed ? (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.1
                  }
                }
              }}
              className="space-y-3"
            >
              {clinics.map((clinic, index) => (
                <motion.button
                  key={clinic.place_id}
                  type="button"
                  aria-label={`Select ${clinic.name}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  onClick={() => setSelectedClinicId(clinic.place_id)}
                  className={cn(
                    "panel-strong w-full p-4 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
                    selectedClinicId === clinic.place_id
                      ? "border-brand-500 bg-brand-50"
                      : "border-slate-200"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {clinic.name}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {clinic.address}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        clinic.open_now
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      )}
                    >
                      {clinic.open_now ? "Open" : "Closed"}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                    <span>{"\u{1F4CD}"} {clinic.distance_km.toFixed(1)} km</span>
                    {clinic.rating ? <span>{"\u2B50"} {clinic.rating.toFixed(1)}</span> : null}
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${clinic.lat},${clinic.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="mt-4 inline-flex text-sm font-semibold text-brand-700 underline"
                  >
                    Get Directions -&gt;
                  </a>
                </motion.button>
              ))}
            </motion.div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
