// @ts-nocheck
// Shim for next/image → standard img
import React from "react";

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  placeholder?: string;
  blurDataURL?: string;
}

export default function Image({ fill, priority: _priority, quality: _quality, placeholder: _placeholder, blurDataURL: _blur, ...props }: ImageProps) {
  if (fill) {
    return <img {...props} style={{ width: '100%', height: '100%', objectFit: 'cover', ...(props.style || {}) }} />;
  }
  return <img {...props} />;
}
