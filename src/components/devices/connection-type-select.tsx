import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import {
  CONNECTION_TYPES,
  connectionLabel,
  type ConnectionType,
} from "@/lib/connection";
import { id } from "@/lib/i18n/id";

/** Required wiring type (LAN/POE or Fiber Optik) of the device's uplink. */
export function ConnectionTypeSelect({
  htmlId,
  value,
  onChange,
}: {
  htmlId: string;
  value: ConnectionType | undefined;
  onChange: (value: ConnectionType) => void;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={htmlId}>{id.connection.field}</FieldLabel>
      <NativeSelect
        id={htmlId}
        value={value ?? "lan_poe"}
        onChange={(e) => onChange(e.target.value as ConnectionType)}
      >
        {CONNECTION_TYPES.map((t) => (
          <option key={t} value={t}>
            {connectionLabel[t]}
          </option>
        ))}
      </NativeSelect>
    </Field>
  );
}
