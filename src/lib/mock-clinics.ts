import type { Clinic } from "@/lib/types";

export const clinics: Clinic[] = [
  {
    name: "Sunrise Rural Health Centre",
    address: "12 Market Road, Nandipur",
    lat: 12.9716,
    lng: 77.5946,
    distance_km: 3.1,
    place_id: "medlens-place-001",
    rating: 4.4,
    open_now: true
  },
  {
    name: "District Community Hospital",
    address: "45 Highway Junction, Taluk Square",
    lat: 12.9912,
    lng: 77.6218,
    distance_km: 8.6,
    place_id: "medlens-place-002",
    rating: 4.1,
    open_now: true
  },
  {
    name: "Green Valley Clinic",
    address: "5 Bus Stand Road, Keshavpur",
    lat: 12.9542,
    lng: 77.5701,
    distance_km: 11.4,
    place_id: "medlens-place-003",
    rating: 3.9,
    open_now: false
  }
];
