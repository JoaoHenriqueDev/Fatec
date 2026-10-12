const TOKEN_KEY = 'fatec_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.erro || `Erro na requisição (${res.status})`);
  }
  return data;
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
  getQuestoes: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/questoes${qs ? `?${qs}` : ''}`);
  },
  getProvas: () => request('/provas'),
  getRedacoes: () => request('/redacoes'),
  postResposta: (payload) => request('/respostas', { method: 'POST', body: payload }),
  postSimulado: (payload) => request('/simulados', { method: 'POST', body: payload }),
  finalizarSimulado: (id) => request(`/simulados/${id}/finalizar`, { method: 'PUT' }),
  getEstatisticas: () => request('/estatisticas'),
  getTrilha: () => request('/trilha/topicos'),
  getQuizTopico: (id) => request(`/trilha/topicos/${id}/quiz`),
  postQuizTopico: (id, respostas) => request(`/trilha/topicos/${id}/quiz`, { method: 'POST', body: { respostas } }),
};
