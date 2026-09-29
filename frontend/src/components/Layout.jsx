import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const links = [
  { to: '/app/questoes', label: 'Questões' },
  { to: '/app/simulado', label: 'Simulado' },
  { to: '/app/redacoes', label: 'Redação' },
  { to: '/app/painel', label: 'Painel' },
];

function linkClass({ isActive }) {
  return [
    'px-3 py-2 rounded-md text-sm font-medium transition-colors',
    isActive
      ? 'bg-blue-600 text-white'
      : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800',
  ].join(' ');
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-4">
            <span className="font-bold text-lg text-blue-600">FATEC Estudos</span>
            <nav className="flex gap-1 flex-wrap">
              {links.map((l) => (
                <NavLink key={l.to} to={l.to} className={linkClass}>
                  {l.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button
              onClick={toggle}
              className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Alternar tema"
            >
              {dark ? '☀️ Claro' : '🌙 Escuro'}
            </button>
            <span className="hidden sm:inline text-slate-500 dark:text-slate-400">Olá, {user?.nome}</span>
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-md bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
