"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";

export function CitySuggest({
  name = "city",
  defaultValue = "",
  required = true,
  placeholder = "Москва",
  className = "",
}: {
  name?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const listId = useId();
  const [value, setValue] = useState(defaultValue);
  const [options, setOptions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = value.trim();
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/users/cities?city=${encodeURIComponent(query)}`);
      const payload = await response.json().catch(() => []);
      setOptions(Array.isArray(payload) ? payload.slice(0, 40) : []);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <label className="flex items-center gap-3 w-full bg-surfaceVariant border border-outline rounded-xl px-4 py-3 focus-within:border-primary">
        <MapPin className="w-5 h-5 text-onSurfaceVariant shrink-0" />
        <input
          name={name}
          value={value}
          required={required}
          autoComplete="off"
          placeholder={placeholder}
          onChange={(event) => {
            setValue(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full bg-transparent outline-none"
        />
      </label>
      {open && options.length > 0 && (
        <ul
          id={listId}
          className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-outline bg-surface shadow-xl"
        >
          {options.map((city) => (
            <li key={city}>
              <button
                type="button"
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-primary/10 hover:text-primary"
                onClick={() => {
                  setValue(city);
                  setOpen(false);
                }}
              >
                {city}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
