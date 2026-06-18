"use client";

import { useEffect, useRef, useState } from "react";

const drivePreviewWidth = 640;
const drivePreviewHeight = 360;

export function DriveHighlightFrame({ src, title }: { src: string; title: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(drivePreviewWidth);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const updateWidth = () => setWidth(wrapper.clientWidth || drivePreviewWidth);
    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(wrapper);
    return () => resizeObserver.disconnect();
  }, []);

  const scale = width / drivePreviewWidth;

  return (
    <div ref={wrapperRef} className="aspect-video overflow-hidden rounded-2xl bg-slate-950">
      <iframe
        className="block border-0"
        src={src}
        title={title}
        allow="autoplay; fullscreen"
        allowFullScreen
        style={{
          width: drivePreviewWidth,
          height: drivePreviewHeight,
          transform: `scale(${scale})`,
          transformOrigin: "top left"
        }}
      />
    </div>
  );
}
