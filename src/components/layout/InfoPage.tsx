interface InfoPageProps {
  title: string;
  subtitle?: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

export function InfoPage({ title, subtitle, lastUpdated, children }: InfoPageProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-8 border-b border-gray-800 pb-6">
        <h1 className="text-3xl font-bold text-gray-100">{title}</h1>
        {subtitle && <p className="mt-2 text-gray-400">{subtitle}</p>}
        {lastUpdated && (
          <p className="mt-3 text-xs text-gray-500">Last updated: {lastUpdated}</p>
        )}
      </header>
      <div className="prose prose-invert max-w-none space-y-6 text-gray-300 leading-relaxed">
        {children}
      </div>
    </div>
  );
}
