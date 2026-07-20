export default function ComparisonMatrix() {
  return (
    <section id="matrix" className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto scroll-mt-24">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-white tracking-tight mb-3 font-sans">
          Architectural Benchmarks
        </h2>
        <p className="text-slate-400 text-sm max-w-xl mx-auto font-sans">
          Comparison between dbportal single-command CLI and traditional desktop tools.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#1e2638] bg-[#0b0e17]">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-[#0e121e] border-b border-[#1e2638] text-slate-300 font-mono">
            <tr>
              <th className="p-4 font-sans">Feature</th>
              <th className="p-4 text-rose-400 bg-rose-950/30 border-x border-rose-500/30 font-bold">dbportal</th>
              <th className="p-4 text-slate-400 font-sans">DBeaver</th>
              <th className="p-4 text-slate-400 font-sans">Docker Desktop</th>
              <th className="p-4 text-slate-400 font-sans">pgAdmin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2638] text-slate-300 font-mono">
            <tr>
              <td className="p-4 font-semibold text-white font-sans">Setup Overhead</td>
              <td className="p-4 text-rose-300 bg-rose-950/20 border-x border-rose-500/20 font-bold">0 Seconds (npx)</td>
              <td className="p-4 text-slate-400">5-10 Mins (Installer)</td>
              <td className="p-4 text-slate-400">5-15 Mins (Heavy GUI)</td>
              <td className="p-4 text-slate-400">10 Mins (Config)</td>
            </tr>
            <tr>
              <td className="p-4 font-semibold text-white font-sans">RAM Footprint</td>
              <td className="p-4 text-rose-300 bg-rose-950/20 border-x border-rose-500/20 font-bold">~45 MB (Node API)</td>
              <td className="p-4 text-slate-400">~650 MB (Java JVM)</td>
              <td className="p-4 text-slate-400">~1.2 GB+ (VM Electron)</td>
              <td className="p-4 text-slate-400">~400 MB (Python/Web)</td>
            </tr>
            <tr>
              <td className="p-4 font-semibold text-white font-sans">Multi-Database Fleet</td>
              <td className="p-4 text-rose-400 bg-rose-950/20 border-x border-rose-500/20 font-bold">✔ Yes (Auto .env)</td>
              <td className="p-4 text-slate-400">Manual Setup</td>
              <td className="p-4 text-rose-400">❌ No (Containers only)</td>
              <td className="p-4 text-rose-400">❌ Postgres only</td>
            </tr>
            <tr>
              <td className="p-4 font-semibold text-white font-sans">Docker Container GUI</td>
              <td className="p-4 text-rose-400 bg-rose-950/20 border-x border-rose-500/20 font-bold">✔ Yes (--docker)</td>
              <td className="p-4 text-rose-400">❌ No</td>
              <td className="p-4 text-emerald-400">✔ Yes</td>
              <td className="p-4 text-rose-400">❌ No</td>
            </tr>
            <tr>
              <td className="p-4 font-semibold text-white font-sans">Read-Only Safety Guarantee</td>
              <td className="p-4 text-rose-400 bg-rose-950/20 border-x border-rose-500/20 font-bold">✔ Yes (Enforced)</td>
              <td className="p-4 text-amber-400">Manual Toggle</td>
              <td className="p-4 text-slate-400">N/A</td>
              <td className="p-4 text-slate-400">Manual Toggle</td>
            </tr>
            <tr>
              <td className="p-4 font-semibold text-white font-sans">Network Isolation</td>
              <td className="p-4 text-rose-400 bg-rose-950/20 border-x border-rose-500/20 font-bold">127.0.0.1 (Local only)</td>
              <td className="p-4 text-slate-400">Local Desktop</td>
              <td className="p-4 text-slate-400">Local Daemon</td>
              <td className="p-4 text-slate-400">Local HTTP</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

