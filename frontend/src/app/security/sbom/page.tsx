"use client";
import { FileBox } from "lucide-react";
import { ResourcePage } from "@/components/common/ResourcePage";

export default function SbomPage() {
  return (
    <ResourcePage
      storageKey="amer.sbom"
      title="SBOM"
      subtitle="Software Bill of Materials per image."
      icon={<FileBox className="h-6 w-6 text-primary" />}
      searchKeys={["image", "package", "version", "license"]}
      fields={[
        { name: "image", label: "Image", required: true, placeholder: "registry/app:1.2.3" },
        { name: "package", label: "Package", required: true },
        { name: "version", label: "Version", required: true },
        { name: "license", label: "License" },
      ]}
    />
  );
}
