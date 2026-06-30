
import ImageManager from "@/components/cloud/ImageManager";
import { useLocale } from "@/contexts/LocaleContext";

export default function ImagesPage() {
  const { t } = useLocale();
  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold">{t("images.title", "Images")}</h1>
      <p className="mb-6 text-sm text-white/60">{t("images.subtitle", "Snapshots from your VPS, custom images, and the public marketplace.")}</p>
      <ImageManager />
    </div>
  );
}
