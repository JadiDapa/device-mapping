/** Client-side shapes of camera points (a subset of the DB rows). */
export type CameraImageView = {
  id: string;
  cameraPointId: string;
  position: number;
  caption: string | null;
  displayKey: string;
  thumbKey: string;
  width: number;
  height: number;
};

export type CameraPointView = {
  id: string;
  zoneId: string;
  name: string;
  notes: string | null;
  lat: number;
  lng: number;
  images: CameraImageView[];
};

/** Uploaded files sit behind login: served by /api/uploads/[...key]. */
export function imageUrl(key: string): string {
  return `/api/uploads/${key}`;
}
