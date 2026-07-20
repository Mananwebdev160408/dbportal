import {
  IconLock,
  IconShieldCheck,
  IconWifiOff,
  IconCpu,
  IconKey,
  IconFileCheck,
} from '@tabler/icons-react';

export default function Security() {
  const points = [
    {
      title: 'Localhost Binding Only (127.0.0.1)',
      desc: 'dbportal binds strictly to your loopback address 127.0.0.1:4444. It is never exposed over public networks or external interfaces.',
      icon: IconLock,
      color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    },
    {
      title: 'Enforced Read-Only Execution Engine',
      desc: 'All database connections operate under strict read-only parameters. Destructive transactions like UPDATE, DELETE, and DROP are blocked at driver level.',
      icon: IconShieldCheck,
      color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    },
    {
      title: 'Zero Cloud Telemetry & 100% Offline',
      desc: 'Zero analytics tracking, zero third-party cloud pings, zero tracking scripts. Operates fully air-gapped without active internet connections.',
      icon: IconWifiOff,
      color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    },
    {
      title: 'Local Docker Socket Isolation',
      desc: 'Communicates directly with your local Docker daemon socket (/var/run/docker.sock or //./pipe/docker_engine) using native dockerode bindings.',
      icon: IconCpu,
      color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    },
    {
      title: 'Zero Cloud Credential Storage',
      desc: 'Your database connection credentials remain isolated inside your local .env file. No tokens or keys are saved externally.',
      icon: IconKey,
      color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    },
    {
      title: 'Open Source MIT License Integrity',
      desc: 'Fully transparent codebase published on GitHub and npmjs. Audit the source code, verify dependencies, and contribute directly.',
      icon: IconFileCheck,
      color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    },
  ];

  return (
    <section id="security" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24">
      <div className="text-center mb-14">
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3 font-sans">
          Security & Local Architecture
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base font-sans">
          Built with an unyielding local-first security stance. Inspect databases without compromising sensitive local or production data.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {points.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.title} className="tech-card p-6 flex flex-col justify-between">
              <div>
                <div className={`w-10 h-10 rounded-lg border flex items-center justify-center mb-4 ${p.color}`}>
                  <Icon size={20} stroke={1.75} />
                </div>
                <h3 className="text-base font-bold text-white mb-2 font-sans">{p.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed font-sans">{p.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}



