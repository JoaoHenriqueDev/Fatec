import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Questoes from './pages/Questoes.jsx';
import Trilha from './pages/Trilha.jsx';
import Simulado from './pages/Simulado.jsx';
import Redacoes from './pages/Redacoes.jsx';
import Dashboard from './pages/Dashboard.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/cadastro" element={<Register />} />
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<Layout />}>
          <Route index element={<Navigate to="questoes" replace />} />
          <Route path="questoes" element={<Questoes />} />
          <Route path="trilha" element={<Trilha />} />
          <Route path="simulado" element={<Simulado />} />
          <Route path="redacoes" element={<Redacoes />} />
          <Route path="painel" element={<Dashboard />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
