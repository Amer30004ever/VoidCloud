export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <div className="p-8 border border-dashed border-border rounded-xl text-center text-muted-foreground">
        This page is under construction.
      </div>
    </div>
  );
}
