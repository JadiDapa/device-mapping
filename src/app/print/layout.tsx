// Print pages are rendered by the export renderer (headless Chromium) with a
// signed token, never directly by users, and depend on live data.
export const dynamic = "force-dynamic";

/**
 * Bare layout (no app header): the page is exactly what gets exported.
 * Always light (PRD-M8 §1): the `.light` scope restores the light tokens even
 * if the user's theme is dark.
 */
export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`@page { size: A4 landscape; margin: 10mm; }`}</style>
      <div
        className="light bg-background text-foreground"
        style={{ colorScheme: "light" }}
      >
        {children}
      </div>
    </>
  );
}
