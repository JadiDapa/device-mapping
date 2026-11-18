// Print pages are rendered by the export renderer (headless Chromium) with a
// signed token, never directly by users, and depend on live data.
export const dynamic = "force-dynamic";

/** Bare layout (no app header): the page is exactly what gets exported. */
export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`@page { size: A4 landscape; margin: 10mm; }`}</style>
      {children}
    </>
  );
}
