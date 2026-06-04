import {
  COMPOSITION_TYPES,
  LANGUAGE_OPTIONS,
  type ContractData,
} from "./types";
import { Building2, Calendar, ChevronDown, Hash, Languages, MapPin, Music, Settings2, Type } from "lucide-react";
import { useState } from "react";

interface Props {
  data: ContractData;
  onChange: (d: Partial<ContractData>) => void;
}

const LOCATION_OPTIONS = [
  "Miami, Florida, United States",
  "Milan, Italy",
  "Mexico City, Mexico",
  "Medellin, Colombia",
  "Madrid, Spain",
  "Montreal, Canada",
  "Monterrey, Mexico",
  "Manila, Philippines",
  "Mumbai, India",
  "Montevideo, Uruguay",
  "Munich, Germany",
  "Marseille, France",
  "Manchester, United Kingdom",
  "Los Angeles, California, United States",
  "New York, New York, United States",
  "Nashville, Tennessee, United States",
  "San Juan, Puerto Rico",
  "Santo Domingo, Dominican Republic",
  "Bogota, Colombia",
  "Buenos Aires, Argentina",
  "Sao Paulo, Brazil",
  "London, United Kingdom",
  "Toronto, Canada",
  "Paris, France",
  "Tokyo, Japan",
  "Seoul, South Korea",
  "United States",
  "Puerto Rico",
  "Mexico",
  "Colombia",
  "Dominican Republic",
  "Spain",
  "Canada",
  "United Kingdom",
  "Argentina",
  "Brazil",
  "Italy",
  "France",
  "Japan",
  "South Korea",
  "Australia",
];

function FieldGroup({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 placeholder:text-muted-foreground/50"
    />
  );
}

function LocationInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const query = value.trim().toLowerCase();
  const suggestions = query
    ? LOCATION_OPTIONS.filter((location) => location.toLowerCase().startsWith(query))
        .concat(LOCATION_OPTIONS.filter((location) => !location.toLowerCase().startsWith(query) && location.toLowerCase().includes(query)))
        .slice(0, 7)
    : [];

  return (
    <div className="relative">
      <input
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Start typing a city or country, e.g. Miami or Mexico"
        className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 placeholder:text-muted-foreground/50"
      />

      {focused && suggestions.length > 0 && (
        <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
          {suggestions.map((location) => (
            <button
              key={location}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                onChange(location);
                setFocused(false);
              }}
              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-secondary"
            >
              {location}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StepMetadata({ data, onChange }: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">SPLIT Sheet: Song Ownership & Registration</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Create a verified split sheet with contributor, publishing, PRO, and MLC-ready metadata.
      </p>

      <div className="space-y-8">
        <FieldGroup icon={Music} label="Song Title">
          <TextInput
            value={data.songTitle}
            onChange={(value) => onChange({ songTitle: value })}
            placeholder="e.g. Moonlight Sessions"
          />
        </FieldGroup>

        <div className="grid gap-4 md:grid-cols-2">
          <FieldGroup icon={Calendar} label="Date of Creation">
            <TextInput
              type="date"
              value={data.creationDate}
              onChange={(value) => onChange({ creationDate: value })}
            />
          </FieldGroup>
          <FieldGroup icon={MapPin} label="Location of Creation">
            <LocationInput
              value={data.creationLocation}
              onChange={(value) => onChange({ creationLocation: value })}
            />
          </FieldGroup>
        </div>

        <FieldGroup icon={Languages} label="Language of Lyrics">
          <select
            value={data.lyricLanguage}
            onChange={(event) => onChange({ lyricLanguage: event.target.value })}
            className="field-input bg-card"
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </FieldGroup>

        <div className="rounded-lg border border-border bg-card">
          <button
            type="button"
            onClick={() => setAdvancedOpen((open) => !open)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
              <Settings2 className="h-4 w-4" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold">Advanced song options</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Original song is assumed. Open this for released-work IDs, alternate titles, or special composition types.
              </span>
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
          </button>

          {advancedOpen && (
            <div className="space-y-4 border-t border-border px-4 py-4">
              <FieldGroup icon={Type} label="Alternate Titles">
                <TextInput
                  value={data.alternateTitles}
                  onChange={(value) => onChange({ alternateTitles: value })}
                  placeholder="Radio edit, Spanish title, working title"
                />
              </FieldGroup>
              <FieldGroup icon={Building2} label="Studio Name">
                <TextInput
                  value={data.studioName}
                  onChange={(value) => onChange({ studioName: value })}
                  placeholder="If recorded at a studio, e.g. Circle House Studios"
                />
              </FieldGroup>
              <div className="grid gap-4 md:grid-cols-2">
                <FieldGroup icon={Hash} label="ISWC">
                  <TextInput
                    value={data.iswc}
                    onChange={(value) => onChange({ iswc: value })}
                    placeholder="Only if already assigned"
                  />
                </FieldGroup>
                <FieldGroup icon={Hash} label="Related ISRC">
                  <TextInput
                    value={data.relatedIsrc}
                    onChange={(value) => onChange({ relatedIsrc: value })}
                    placeholder="Only if the recording is released"
                  />
                </FieldGroup>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Composition Type
                </label>
                <select
                  value={data.compositionType}
                  onChange={(event) => onChange({ compositionType: event.target.value })}
                  className="field-input bg-background"
                >
                  {COMPOSITION_TYPES.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
