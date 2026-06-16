import { Input } from "@/components/ui/input";
import { MapPin, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type AddressFields = {
  addressLine: string;
  zipCode: string;
  city: string;
  state: string;
  country: string;
};

type AddressFieldName = keyof AddressFields;

type AddressSearchFieldProps = {
  id: string;
  value: AddressFields;
  onFieldChange: (field: AddressFieldName, value: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
};

type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type GooglePlace = {
  address_components?: GoogleAddressComponent[];
  formatted_address?: string;
  name?: string;
};

type GoogleMapsListener = {
  remove: () => void;
};

type GoogleAutocomplete = {
  addListener: (eventName: "place_changed", handler: () => void) => GoogleMapsListener;
  getPlace: () => GooglePlace;
};

type GoogleMapsGlobal = {
  maps?: {
    places?: {
      Autocomplete: new (
        input: HTMLInputElement,
        options: { fields: string[]; types: string[] },
      ) => GoogleAutocomplete;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleMapsGlobal;
    __splitGooglePlacesPromise?: Promise<void>;
  }
}

const fallbackAddresses: AddressFields[] = [
  { addressLine: "1500 Broadway", zipCode: "10036", city: "New York", state: "NY", country: "United States" },
  { addressLine: "1600 Vine Street", zipCode: "90028", city: "Los Angeles", state: "CA", country: "United States" },
  { addressLine: "10 Music Square East", zipCode: "37203", city: "Nashville", state: "TN", country: "United States" },
  { addressLine: "1 SE 3rd Avenue", zipCode: "33131", city: "Miami", state: "FL", country: "United States" },
  { addressLine: "501 NE 1st Avenue", zipCode: "33132", city: "Miami", state: "FL", country: "United States" },
  { addressLine: "601 Biscayne Boulevard", zipCode: "33132", city: "Miami", state: "FL", country: "United States" },
  { addressLine: "1300 S Miami Avenue", zipCode: "33130", city: "Miami", state: "FL", country: "United States" },
  { addressLine: "1111 Lincoln Road", zipCode: "33139", city: "Miami Beach", state: "FL", country: "United States" },
  { addressLine: "8300 NW 53rd Street", zipCode: "33166", city: "Doral", state: "FL", country: "United States" },
  { addressLine: "2320 Salzedo Street", zipCode: "33134", city: "Coral Gables", state: "FL", country: "United States" },
  { addressLine: "3500 Pan American Drive", zipCode: "33133", city: "Miami", state: "FL", country: "United States" },
  { addressLine: "401 Biscayne Boulevard", zipCode: "33132", city: "Miami", state: "FL", country: "United States" },
  { addressLine: "Miami, Florida", zipCode: "", city: "Miami", state: "FL", country: "United States" },
  { addressLine: "Miami Beach, Florida", zipCode: "", city: "Miami Beach", state: "FL", country: "United States" },
  { addressLine: "Doral, Florida", zipCode: "", city: "Doral", state: "FL", country: "United States" },
  { addressLine: "Hialeah, Florida", zipCode: "", city: "Hialeah", state: "FL", country: "United States" },
  { addressLine: "Fort Lauderdale, Florida", zipCode: "", city: "Fort Lauderdale", state: "FL", country: "United States" },
  { addressLine: "Orlando, Florida", zipCode: "", city: "Orlando", state: "FL", country: "United States" },
  { addressLine: "Mexico City, Mexico", zipCode: "", city: "Mexico City", state: "CDMX", country: "Mexico" },
  { addressLine: "San Juan, Puerto Rico", zipCode: "", city: "San Juan", state: "PR", country: "Puerto Rico" },
  { addressLine: "Santo Domingo, Dominican Republic", zipCode: "", city: "Santo Domingo", state: "", country: "Dominican Republic" },
  { addressLine: "Bogota, Colombia", zipCode: "", city: "Bogota", state: "", country: "Colombia" },
  { addressLine: "Madrid, Spain", zipCode: "", city: "Madrid", state: "", country: "Spain" },
  { addressLine: "London, United Kingdom", zipCode: "", city: "London", state: "", country: "United Kingdom" },
];

export default function AddressSearchField({
  id,
  value,
  onFieldChange,
  className,
  placeholder = "Start typing your full address",
  required,
}: AddressSearchFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [focused, setFocused] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleUnavailable, setGoogleUnavailable] = useState(false);

  const applyAddress = useCallback(
    (address: AddressFields) => {
      onFieldChange("addressLine", address.addressLine);
      onFieldChange("zipCode", address.zipCode);
      onFieldChange("city", address.city);
      onFieldChange("state", address.state);
      onFieldChange("country", address.country);
      setFocused(false);
    },
    [onFieldChange],
  );

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const input = inputRef.current;

    if (!apiKey || !input) {
      setGoogleUnavailable(true);
      return;
    }

    let listener: GoogleMapsListener | undefined;
    let cancelled = false;

    loadGooglePlaces(apiKey)
      .then(() => {
        if (cancelled || !window.google?.maps?.places || !inputRef.current) return;

        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ["address_components", "formatted_address", "name"],
          types: ["address"],
        });

        listener = autocomplete.addListener("place_changed", () => {
          const parsed = parseGooglePlace(autocomplete.getPlace());
          if (parsed) applyAddress(parsed);
        });

        setGoogleReady(true);
        setGoogleUnavailable(false);
      })
      .catch(() => {
        if (!cancelled) setGoogleUnavailable(true);
      });

    return () => {
      cancelled = true;
      listener?.remove();
    };
  }, [applyAddress]);

  const fallbackMatches = useMemo(() => {
    const query = value.addressLine.trim().toLowerCase();
    if (query.length < 2 || googleReady) return [];

    return fallbackAddresses
      .filter((address) => formatAddress(address).toLowerCase().includes(query))
      .slice(0, 6);
  }, [googleReady, value.addressLine]);

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          value={value.addressLine}
          onChange={(event) => onFieldChange("addressLine", event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 150)}
          placeholder={placeholder}
          required={required}
          autoComplete="street-address"
          className={className}
        />
        <Search className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>


      {focused && fallbackMatches.length > 0 && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          {fallbackMatches.map((address) => (
            <button
              key={formatAddress(address)}
              type="button"
              className="flex w-full gap-2 px-3 py-2 text-left text-xs leading-5 transition-colors hover:bg-secondary"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => applyAddress(address)}
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
              <span>{formatAddress(address)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function loadGooglePlaces(apiKey: string) {
  if (window.google?.maps?.places) return Promise.resolve();
  if (window.__splitGooglePlacesPromise) return window.__splitGooglePlacesPromise;

  window.__splitGooglePlacesPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&v=weekly`;
    script.async = true;
    script.defer = true;
    script.dataset.splitGooglePlaces = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Places failed to load"));
    document.head.appendChild(script);
  });

  return window.__splitGooglePlacesPromise;
}

function parseGooglePlace(place: GooglePlace): AddressFields | null {
  const components = place.address_components ?? [];
  if (components.length === 0) return null;

  const streetNumber = getComponent(components, "street_number", "long_name");
  const route = getComponent(components, "route", "long_name");
  const city =
    getComponent(components, "locality", "long_name") ||
    getComponent(components, "postal_town", "long_name") ||
    getComponent(components, "sublocality", "long_name") ||
    getComponent(components, "neighborhood", "long_name");
  const state = getComponent(components, "administrative_area_level_1", "short_name");
  const postalCode = getComponent(components, "postal_code", "long_name");
  const postalSuffix = getComponent(components, "postal_code_suffix", "long_name");
  const country = getComponent(components, "country", "long_name");
  const addressLine = [streetNumber, route].filter(Boolean).join(" ") || place.name || place.formatted_address || "";

  return {
    addressLine,
    zipCode: [postalCode, postalSuffix].filter(Boolean).join("-"),
    city,
    state,
    country,
  };
}

function getComponent(
  components: GoogleAddressComponent[],
  type: string,
  name: "long_name" | "short_name",
) {
  return components.find((component) => component.types.includes(type))?.[name] ?? "";
}

function formatAddress(address: AddressFields) {
  return [address.addressLine, address.city, [address.state, address.zipCode].filter(Boolean).join(" "), address.country]
    .filter(Boolean)
    .join(", ");
}
