// @ts-nocheck
// Shim for next/link → standard anchor
import React from "react";
import { Link as WouterLink } from "wouter";

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  prefetch?: boolean;
}

export default function Link({ href, children, prefetch: _prefetch, ...props }: LinkProps) {
  return <WouterLink href={href} {...props}>{children}</WouterLink>;
}
