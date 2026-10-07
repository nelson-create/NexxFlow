import { Icon, IconName } from '../components/Icon';
import { Logo } from '../components/ui';

const highlights: { icon: IconName; title: string; text: string }[] = [
  { icon: 'users', title: 'Shoot as a team', text: 'Photographers upload straight into the event.' },
  { icon: 'checkCircle', title: 'Curate in one place', text: 'Pick the keepers with a single click.' },
  { icon: 'lock', title: 'Deliver privately', text: 'Clients open a PIN-protected gallery.' },
];

export const AuthLayout = ({ title, subtitle, children }: { title: string; subtitle: React.ReactNode; children: React.ReactNode }) => (
  <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
    <aside className="relative hidden overflow-hidden bg-zinc-950 p-12 text-white lg:flex lg:flex-col">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="relative">
        <Logo to="/" light />
      </div>
      <div className="relative mt-auto max-w-md">
        <h2 className="font-display text-4xl font-medium leading-tight tracking-tight">
          From the shoot to the client&apos;s screen, in one flow.
        </h2>
        <ul className="mt-10 space-y-5">
          {highlights.map((item) => (
            <li key={item.title} className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
                <Icon name={item.icon} className="h-5 w-5 text-brand-300" />
              </span>
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-white/60">{item.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <p className="relative mt-16 text-xs text-white/40">© {new Date().getFullYear()} Nexxflow</p>
    </aside>

    <section className="flex flex-col px-4 py-8 sm:px-8">
      <div className="lg:hidden">
        <Logo to="/" />
      </div>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
        <p className="mt-2 text-sm text-zinc-500">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  </div>
);
