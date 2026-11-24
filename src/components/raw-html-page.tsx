export function RawHtmlPage({ src, title }: { src: string; title: string }) {
  return (
    <iframe
      src={src}
      title={title}
      className="fixed inset-0 h-full w-full border-0 bg-background"
      style={{ height: "100dvh" }}
    />
  );
}
