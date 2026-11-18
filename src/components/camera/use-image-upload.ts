"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-resize";
import { fmt } from "@/lib/i18n/format";
import { id as t } from "@/lib/i18n/id";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGES_PER_POINT,
} from "@/lib/validators/camera";
import type { CameraImageView } from "./types";

export type UploadStatus = "queued" | "compressing" | "uploading" | "error";

export type UploadItem = {
  key: string;
  name: string;
  status: UploadStatus;
  /** 0..1 while uploading. */
  progress: number;
  error?: string;
};

const MAX_PARALLEL = 2;

type Response =
  | { ok: true; data: { image: CameraImageView } }
  | { ok: false; status: number; error: string };

function post(
  pointId: string,
  form: FormData,
  onProgress: (p: number) => void,
): Promise<Response> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/camera-points/${pointId}/images`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onerror = () =>
      resolve({ ok: false, status: 0, error: t.camera.uploadFailed });
    xhr.onload = () => {
      try {
        resolve(JSON.parse(xhr.responseText) as Response);
      } catch {
        resolve({
          ok: false,
          status: xhr.status,
          error: t.camera.uploadFailed,
        });
      }
    };
    xhr.send(form);
  });
}

/**
 * Upload queue for one camera point: compress in the browser, then POST each
 * image (max 2 at a time). A failed file stays in the list with a retry; the
 * others are unaffected. `currentCount` enforces the per-point limit up front.
 */
export function useImageUpload({
  pointId,
  currentCount,
  onUploaded,
}: {
  pointId: string;
  currentCount: number;
  onUploaded: (image: CameraImageView) => void;
}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const filesRef = useRef(new Map<string, File>());
  const queueRef = useRef<string[]>([]);
  const activeRef = useRef(0);
  const countRef = useRef(currentCount);
  countRef.current = currentCount;
  const doneRef = useRef(0);

  const patch = useCallback((key: string, p: Partial<UploadItem>) => {
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i)));
  }, []);
  const remove = useCallback((key: string) => {
    filesRef.current.delete(key);
    setItems((list) => list.filter((i) => i.key !== key));
  }, []);

  const pumpRef = useRef<() => void>(() => {});

  const run = useCallback(
    async (key: string) => {
      const file = filesRef.current.get(key);
      if (!file) return;
      try {
        patch(key, { status: "compressing", progress: 0, error: undefined });
        const { display, thumb } = await compressImage(file);
        patch(key, { status: "uploading", progress: 0 });
        const form = new FormData();
        form.set("display", display, "display");
        form.set("thumb", thumb, "thumb");
        const res = await post(pointId, form, (p) =>
          patch(key, { progress: p }),
        );
        if (res.ok) {
          onUploaded(res.data.image);
          doneRef.current += 1;
          remove(key);
        } else {
          patch(key, { status: "error", error: res.error });
        }
      } catch {
        patch(key, { status: "error", error: t.camera.invalidImage });
      } finally {
        activeRef.current -= 1;
        pumpRef.current();
      }
    },
    [onUploaded, patch, pointId, remove],
  );

  pumpRef.current = () => {
    while (activeRef.current < MAX_PARALLEL && queueRef.current.length > 0) {
      const key = queueRef.current.shift()!;
      activeRef.current += 1;
      void run(key);
    }
    if (activeRef.current === 0 && doneRef.current > 0) {
      toast.success(fmt(t.camera.uploadedN, { n: doneRef.current }));
      doneRef.current = 0;
    }
  };

  const add = useCallback(
    (files: File[]) => {
      const room = Math.max(0, MAX_IMAGES_PER_POINT - countRef.current);
      const pending = items.filter((i) => i.status !== "error").length;
      let slots = Math.max(0, room - pending);
      const added: UploadItem[] = [];
      for (const file of files) {
        if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
          toast.error(`${file.name}: ${t.camera.unsupportedType}`);
          continue;
        }
        if (slots <= 0) {
          toast.error(fmt(t.camera.imageLimit, { n: MAX_IMAGES_PER_POINT }));
          break;
        }
        slots -= 1;
        const key = crypto.randomUUID();
        filesRef.current.set(key, file);
        queueRef.current.push(key);
        added.push({
          key,
          name: file.name,
          status: "queued",
          progress: 0,
        });
      }
      if (added.length === 0) return;
      setItems((list) => [...list, ...added]);
      pumpRef.current();
    },
    [items],
  );

  const retry = useCallback(
    (key: string) => {
      patch(key, { status: "queued", error: undefined, progress: 0 });
      queueRef.current.push(key);
      pumpRef.current();
    },
    [patch],
  );

  const dismiss = useCallback((key: string) => remove(key), [remove]);

  return { items, add, retry, dismiss };
}
