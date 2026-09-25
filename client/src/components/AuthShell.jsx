import Logo from './Logo.jsx';

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="grid min-h-full lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="hidden flex-col justify-between bg-ink p-10 text-white lg:flex">
        <Logo light />
        <div>
          <h1 className="max-w-md text-4xl font-bold leading-tight">
            One shared room for the whole technical interview.
          </h1>
          <p className="mt-4 max-w-sm text-white/70">
            Write code together, chat, share questions and see test results the moment the candidate submits.
          </p>
        </div>
        <p className="text-sm text-white/50">Each interview gets its own private room. Only its two participants can enter.</p>
      </div>

      <div className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="mb-6 mt-1 text-sm text-muted">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
