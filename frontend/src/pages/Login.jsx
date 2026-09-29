import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', senha: '' });
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      await login(form);
      navigate('/app/questoes');
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <Link to="/" className="block text-center font-bold text-lg text-blue-600 mb-6">
          FATEC Estudos
        </Link>
        <form onSubmit={onSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <h1 className="text-xl font-bold">Entrar</h1>
          {erro && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-300 px-3 py-2 rounded-md">{erro}</p>}
          <div>
            <label className="block text-sm font-medium mb-1">E-mail</label>
            <input value={form.email} onChange={update('email')} className="input" type="email" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Senha</label>
            <input value={form.senha} onChange={update('senha')} className="input" type="password" />
          </div>
          <button disabled={loading} className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          <p className="text-sm text-center text-slate-600 dark:text-slate-400">
            Não tem conta?{' '}
            <Link to="/cadastro" className="text-blue-600 font-medium">
              Cadastre-se
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
