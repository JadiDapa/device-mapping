import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { id } from "@/lib/i18n/id";

export type SourceOption = {
  id: string;
  name: string;
  kind: string;
  zoneId: string | null;
};

/** Optional "network source" dropdown for the device create/edit forms. */
export function SourceSelect({
  htmlId,
  value,
  onChange,
  sources,
  zoneId,
}: {
  htmlId: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  sources: SourceOption[];
  /** Zone being edited: its own and zone-less sources are listed first. */
  zoneId: string;
}) {
  const here = sources.filter((s) => s.zoneId === zoneId || s.zoneId === null);
  const other = sources.filter((s) => s.zoneId !== zoneId && s.zoneId !== null);
  const label = (s: SourceOption) => `${s.name} (${s.kind})`;
  return (
    <Field>
      <FieldLabel htmlFor={htmlId}>{id.source.deviceField}</FieldLabel>
      <NativeSelect
        id={htmlId}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{id.source.deviceFieldNone}</option>
        {here.length > 0 && (
          <optgroup label={id.source.deviceFieldHere}>
            {here.map((s) => (
              <option key={s.id} value={s.id}>
                {label(s)}
              </option>
            ))}
          </optgroup>
        )}
        {other.length > 0 && (
          <optgroup label={id.source.deviceFieldOther}>
            {other.map((s) => (
              <option key={s.id} value={s.id}>
                {label(s)}
              </option>
            ))}
          </optgroup>
        )}
      </NativeSelect>
    </Field>
  );
}
