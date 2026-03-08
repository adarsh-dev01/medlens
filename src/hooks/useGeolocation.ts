"use client";

import { useEffect, useState } from "react";

type GeolocationState = {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
};

const initialState: GeolocationState = {
  latitude: null,
  longitude: null,
  error: null,
  loading: true
};

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>(initialState);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setState({
        latitude: null,
        longitude: null,
        error: "Geolocation is not supported by this browser.",
        loading: false
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false
        });
      },
      (error) => {
        let message = "We could not get your location. You can still browse nearby care options manually.";

        if (error.code === error.PERMISSION_DENIED) {
          message = "Location permission was denied. Please allow location access to find nearby healthcare options.";
        } else if (error.code === error.TIMEOUT) {
          message = "Location lookup timed out. Please try again or check your device location settings.";
        }

        setState({
          latitude: null,
          longitude: null,
          error: message,
          loading: false
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  }, []);

  return state;
}
