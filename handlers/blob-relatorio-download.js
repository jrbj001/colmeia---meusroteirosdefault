const { BlobServiceClient } = require('@azure/storage-blob');

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const BLOB_CONTAINER = process.env.AZURE_STORAGE_CONTAINER || 'colmeia-relatorios';

// Acha a ÚLTIMA versão do relatório do plano. Casa o pk ancorado em '_' (12 não casa 123).
async function findLatestBlob(containerClient, planoMidiaGrupo_pk) {
  const pkRegex = new RegExp('(^|_)' + String(planoMidiaGrupo_pk) + '_');
  let latest = null;
  for await (const blob of containerClient.listBlobsFlat({ prefix: 'relatorio_' })) {
    if (!blob.name.endsWith('.xlsx')) continue;
    if (!pkRegex.test(blob.name)) continue;
    const modified = blob.properties?.lastModified ? new Date(blob.properties.lastModified).getTime() : 0;
    if (!latest || modified > latest.modified || (modified === latest.modified && blob.name > latest.name)) {
      latest = { name: blob.name, modified };
    }
  }
  return latest;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Método não permitido. Use POST.' });

  try {
    const { planoMidiaGrupo_pk, checkOnly } = req.body;
    if (!planoMidiaGrupo_pk) return res.status(400).json({ success: false, message: 'Parâmetro planoMidiaGrupo_pk é obrigatório' });
    if (!AZURE_STORAGE_CONNECTION_STRING) return res.status(500).json({ success: false, message: 'Configuração do Azure Blob não encontrada.' });

    const containerClient = BlobServiceClient
      .fromConnectionString(AZURE_STORAGE_CONNECTION_STRING)
      .getContainerClient(BLOB_CONTAINER);

    const latest = await findLatestBlob(containerClient, planoMidiaGrupo_pk);

    // Modo verificação: apenas informa se existe, sem baixar
    if (checkOnly) {
      if (!latest) return res.status(200).json({ exists: false });
      return res.status(200).json({ exists: true, filename: latest.name });
    }

    if (!latest) return res.status(404).json({ success: false, message: `Nenhum relatório (formato novo) para planoMidiaGrupo_pk = ${planoMidiaGrupo_pk}` });

    const buffer = await containerClient.getBlockBlobClient(latest.name).downloadToBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${latest.name}"`);
    res.setHeader('Content-Length', buffer.length);
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Erro ao baixar relatório do Blob:', error);
    return res.status(500).json({ success: false, message: 'Erro ao buscar relatório no Azure Blob', error: error.message });
  }
};
