export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="page">
      <article className="stack-lg narrow">
        <h1 className="page-title">{title}</h1>
        <p className="notice error">
          Document provisoire : les passages entre crochets doivent être complétés et validés par les Éditions M-Éditer avant
          l&apos;ouverture au public.
        </p>
        {children}
      </article>
    </main>
  );
}
