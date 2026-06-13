"use client";

import ImageManager from "@/components/cloud/ImageManager";

export default function ImagesPage() {
  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold">Images</h1>
      <p className="mb-6 text-sm text-white/60">Snapshots from your VPS, custom images, and the public marketplace.</p>
      <ImageManager />
    </div>
  );
}
