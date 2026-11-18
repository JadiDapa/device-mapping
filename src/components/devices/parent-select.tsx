import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { fmt } from "@/lib/i18n/format";
import { id } from "@/lib/i18n/id";

export type RouterOption = {
  id: string;
  seq: number;
  locationDetail: string | null;
};

export function routerLabel(r: RouterOption): string {
  const base = fmt(id.device.routerOption, { seq: r.seq });
  return r.locationDetail ? `${base} · ${r.locationDetail}` : base;
}

/**
 * "Connected to router" dropdown (chain: source -> router+BLE -> device).
 * Only offered for non-router devices; lists the zone's routers.
 */
export function ParentSelect({
  htmlId,
  value,
  onChange,
  routers,
}: {
  htmlId: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  routers: RouterOption[];
}) {
  return (
    <Field>
      <FieldLabel htmlFor={htmlId}>{id.device.parentField}</FieldLabel>
      <NativeSelect
        id={htmlId}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{id.device.parentFieldNone}</option>
        {routers.map((r) => (
          <option key={r.id} value={r.id}>
            {routerLabel(r)}
          </option>
        ))}
      </NativeSelect>
    </Field>
  );
}
