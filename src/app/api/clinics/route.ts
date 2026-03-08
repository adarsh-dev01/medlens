import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  radius: z.coerce.number().positive().default(25000),
  type: z.enum(["hospital", "doctor", "pharmacy"]).default("hospital")
});

const telemedicineOptions = [
  {
    name: "WHO Health Helpline",
    url: "https://www.who.int/emergencies/information"
  },
  {
    name: "Teladoc Health",
    url: "https://www.teladoc.com"
  },
  {
    name: "FindAHealthCenter.hrsa.gov",
    url: "https://findahealthcenter.hrsa.gov"
  }
];

const searchProfiles = {
  hospital: ["hospital"],
  doctor: ["doctor"],
  pharmacy: ["pharmacy"]
} as const;

const placesFieldMask = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.currentOpeningHours.openNow",
  "places.googleMapsUri"
].join(",");

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
) {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(endLat - startLat);
  const deltaLng = toRadians(endLng - startLng);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(startLat)) *
      Math.cos(toRadians(endLat)) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function fallbackResponse(message?: string) {
  return NextResponse.json({
    results: [],
    fallback_used: true,
    telemedicine_options: telemedicineOptions,
    message: message ?? null
  });
}

type PlacesSearchNearbyResponse = {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    rating?: number;
    currentOpeningHours?: { openNow?: boolean };
    googleMapsUri?: string;
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

function mapResults(data: PlacesSearchNearbyResponse, latitude: number, longitude: number) {
  return (data.places ?? [])
    .filter(
      (place) =>
        place.id &&
        place.displayName?.text &&
        place.formattedAddress &&
        place.location?.latitude !== undefined &&
        place.location?.longitude !== undefined
    )
    .map((place) => ({
      name: place.displayName?.text as string,
      address: place.formattedAddress as string,
      lat: place.location?.latitude as number,
      lng: place.location?.longitude as number,
      distance_km: haversineDistanceKm(
        latitude,
        longitude,
        place.location?.latitude as number,
        place.location?.longitude as number
      ),
      place_id: place.id as string,
      rating: place.rating ?? 0,
      open_now: place.currentOpeningHours?.openNow ?? false,
      google_maps_uri: place.googleMapsUri ?? null
    }))
    .sort((left, right) => left.distance_km - right.distance_km)
    .slice(0, 10);
}

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json(
      {
        message: "lat and lng query parameters are required."
      },
      { status: 400 }
    );
  }

  const parsedQuery = querySchema.safeParse({
    lat,
    lng,
    radius: request.nextUrl.searchParams.get("radius") ?? 25000,
    type: request.nextUrl.searchParams.get("type") ?? "hospital"
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        message: "Invalid clinic search parameters.",
        issues: parsedQuery.error.flatten()
      },
      { status: 400 }
    );
  }

  const { lat: latitude, lng: longitude, radius, type } = parsedQuery.data;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return fallbackResponse(
      "Google Maps is not configured. Add a valid Google Maps API key to load nearby facilities."
    );
  }

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": placesFieldMask
      },
      body: JSON.stringify({
        includedTypes: searchProfiles[type],
        maxResultCount: 10,
        rankPreference: "DISTANCE",
        locationRestriction: {
          circle: {
            center: {
              latitude,
              longitude
            },
            radius
          }
        }
      })
    });

    const data = (await response.json()) as PlacesSearchNearbyResponse;

    if (!response.ok) {
      if (data.error?.status === "SERVICE_DISABLED") {
        return fallbackResponse(
          "Places API (New) is disabled for this Google Cloud project. Enable Places API (New) for this API key, wait a few minutes, and try again."
        );
      }

      if (data.error?.status === "PERMISSION_DENIED") {
        return fallbackResponse(
          data.error.message ||
            "Google denied the nearby search request. Check API restrictions, billing, and Places API (New) access for this key."
        );
      }

      return fallbackResponse(
        data.error?.message ||
          "Google Places could not be reached right now. Try again in a moment or use the telemedicine options below."
      );
    }

    const mappedResults = mapResults(data, latitude, longitude);

    if (!mappedResults.length) {
      return fallbackResponse(
        "No nearby facilities were returned for this search. Try another location or facility type."
      );
    }

    return NextResponse.json({
      results: mappedResults,
      fallback_used: false,
      telemedicine_options: [],
      message: null
    });
  } catch {
    return fallbackResponse(
      "Nearby facilities could not be loaded right now. Check your internet connection and Google Maps setup."
    );
  }
}
