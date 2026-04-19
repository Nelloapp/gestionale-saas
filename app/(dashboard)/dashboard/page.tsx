const kpis = [
  {
    title: 'Fatturato',
    value: '€ 124.800',
    detail: '+18% rispetto al mese scorso',
    tone: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    title: 'Fatture Scadute',
    value: '16',
    detail: 'Monitorare solleciti e pagamenti',
    tone: 'text-rose-600',
    bg: 'bg-rose-50',
  },
  {
    title: 'Clienti Attivi',
    value: '84',
    detail: 'Relazioni commerciali attive',
    tone: 'text-sky-600',
    bg: 'bg-sky-50',
  },
  {
    title: 'Stock Sotto Soglia',
    value: '12 articoli',
    detail: 'Rifornire presto',
    tone: 'text-amber-600',
    bg: 'bg-amber-50',
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Panoramica aziendale</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            I principali KPI del tuo gestionale SaaS con dati di esempio.
          </p>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <article key={item.title} className="rounded-[1.75rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">{item.title}</p>
                <p className="mt-4 text-3xl font-semibold text-slate-950">{item.value}</p>
              </div>
              <div className={`${item.bg} rounded-2xl px-3 py-2 text-sm font-semibold ${item.tone}`}>
                {item.detail}
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Fatturato</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">Obiettivo mensile</h2>
            </div>
            <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">+18%</span>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.5rem] bg-slate-50 p-6">
              <p className="text-sm text-slate-500">Fatturato prevista</p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">€ 152.000</p>
            </div>
            <div className="rounded-[1.5rem] bg-slate-50 p-6">
              <p className="text-sm text-slate-500">Fatture emesse</p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">74</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div>
            <p className="text-sm font-medium text-slate-500">Indicatori rapidi</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">Stato operativo</h2>
          </div>
          <div className="mt-6 space-y-4">
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-700">Principali clienti</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">12 nuove opportunità</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-700">Ordini in corso</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">28</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-700">Progetti attivi</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">7</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
