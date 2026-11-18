"use client";

import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { id } from "@/lib/i18n/id";
import { PARTIAL_COMPONENTS, type PartialComponent } from "@/lib/status";

export type PartialValue = {
  hasPower: boolean;
  hasFo: boolean;
  hasEthernet: boolean;
  partialNote: string;
};

const FIELD: Record<PartialComponent, "hasPower" | "hasFo" | "hasEthernet"> = {
  power: "hasPower",
  fo: "hasFo",
  ethernet: "hasEthernet",
};

/** Power / FO / Ethernet checklist + free note for a `partial` device. */
export function PartialFields({
  value,
  onChange,
  error,
  disabled,
}: {
  value: PartialValue;
  onChange: (patch: Partial<PartialValue>) => void;
  error?: string | null;
  disabled?: boolean;
}) {
  const uid = useId();
  return (
    <fieldset className="space-y-3 rounded-md border p-3" disabled={disabled}>
      <legend className="px-1 text-sm font-medium">
        {id.statusChange.partialChecklist}
      </legend>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {PARTIAL_COMPONENTS.map((c) => {
          const checkId = `${uid}-${c}`;
          return (
            <label
              key={c}
              htmlFor={checkId}
              className="flex min-h-11 items-center gap-2 text-sm md:min-h-0"
            >
              <Checkbox
                id={checkId}
                checked={value[FIELD[c]]}
                onCheckedChange={(v) => onChange({ [FIELD[c]]: v === true })}
              />
              {id.partialComponent[c]}
            </label>
          );
        })}
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${uid}-note`} className="text-sm">
          {id.statusChange.partialNote}
        </label>
        <Textarea
          id={`${uid}-note`}
          rows={2}
          value={value.partialNote}
          onChange={(e) => onChange({ partialNote: e.target.value })}
          aria-invalid={!!error}
        />
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </fieldset>
  );
}
