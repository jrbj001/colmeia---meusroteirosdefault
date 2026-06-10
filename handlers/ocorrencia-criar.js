/**
 * Handler: registrar ocorrência no Notion
 *
 * Env vars necessárias no Vercel:
 *   NOTION_TOKEN          — Integration token (Internal Integration Secret)
 *   NOTION_OCORRENCIAS_DB — ID da database (sem traços)
 *
 * Database ID: c3b08e7d30d945bf91b870d43affe8f2
 */

const NOTION_DB_ID = process.env.NOTION_OCORRENCIAS_DB || 'c3b08e7d30d945bf91b870d43affe8f2';
const NOTION_API   = 'https://api.notion.com/v1/pages';
const NOTION_VER   = '2022-06-28';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tipo, gravidade, descricao, titulo, usuario, url_origem } = req.body || {};

  if (!descricao || !tipo) {
    return res.status(400).json({ error: 'Campos obrigatórios: tipo e descricao' });
  }

  const token = process.env.NOTION_TOKEN;
  if (!token) {
    console.warn('[ocorrencia] NOTION_TOKEN não configurado — registrando só no log');
    console.log('[ocorrencia]', { tipo, gravidade, descricao, titulo, usuario, url_origem });
    return res.status(200).json({ success: true, fallback: true });
  }

  const tituloFinal = titulo || `[${tipo}] ${descricao.slice(0, 60)}${descricao.length > 60 ? '…' : ''}`;

  const body = {
    parent: { database_id: NOTION_DB_ID },
    properties: {
      'Título': {
        title: [{ text: { content: tituloFinal } }],
      },
      'Tipo': {
        select: { name: tipo },
      },
      'Status': {
        select: { name: 'Aberto' },
      },
      ...(gravidade ? { 'Gravidade': { select: { name: gravidade } } } : {}),
      'Descrição': {
        rich_text: [{ text: { content: descricao } }],
      },
      'Usuário': {
        rich_text: [{ text: { content: usuario || '' } }],
      },
      'URL': {
        url: url_origem || null,
      },
    },
  };

  try {
    const response = await fetch(NOTION_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Notion-Version': NOTION_VER,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('[ocorrencia] Notion API error:', err);
      return res.status(502).json({ error: 'Erro ao registrar no Notion', detail: err });
    }

    const data = await response.json();
    return res.status(200).json({ success: true, notion_id: data.id });
  } catch (err) {
    console.error('[ocorrencia] Erro inesperado:', err);
    return res.status(500).json({ error: 'Erro interno', detail: err.message });
  }
};
