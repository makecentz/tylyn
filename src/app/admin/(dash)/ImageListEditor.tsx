"use client";

import { useState } from "react";
import { uploadAdminImage } from "../actions";

/** Upload, reorder and remove a list of image URLs. The first image is the main one. */
export function ImageListEditor({ value, onChange, max = 12 }: { value: string[]; onChange: (v: string[]) => void; max?: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    const added: string[] = [];
    for (const file of Array.from(files).slice(0, max - value.length)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadAdminImage(fd);
      if (res.error) setError(res.error);
      if (res.url) added.push(res.url);
    }
    onChange([...value, ...added]);
    setBusy(false);
  }

  const move = (i: number, d: number) => {
    const next = [...value];
    const [x] = next.splice(i, 1);
    next.splice(Math.max(0, Math.min(next.length, i + d)), 0, x);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
        {value.map((src, i) => (
          <div key={src + i} className={`flex flex-col overflow-hidden rounded-xl border-2 ${i === 0 ? "border-pink" : "border-line"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Image ${i + 1}`} className="aspect-square w-full object-cover" />
            <div className="flex items-center justify-between bg-white px-1 text-xs">
              <button type="button" aria-label="Move earlier" onClick={() => move(i, -1)} disabled={i === 0} className="h-9 w-9 disabled:opacity-30">←</button>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="h-9 px-1 font-semibold text-[#B3124F]">Remove</button>
              <button type="button" aria-label="Move later" onClick={() => move(i, 1)} disabled={i === value.length - 1} className="h-9 w-9 disabled:opacity-30">→</button>
            </div>
          </div>
        ))}
        {value.length < max ? (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed border-pink bg-blush text-center text-sm font-bold text-pink-deep">
            {busy ? "Uploading…" : "+ Upload"}
            <input type="file" accept="image/*" multiple className="sr-only" disabled={busy} onChange={(e) => upload(e.target.files)} />
          </label>
        ) : null}
      </div>
      {error ? <p role="alert" className="text-sm text-[#B3124F]">{error}</p> : null}
    </div>
  );
}
