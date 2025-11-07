/**
 * API Serverless - Download de Excel do SharePoint
 * 
 * Busca arquivo no SharePoint por planoMidiaGrupo_pk e retorna para download
 * 
 * Endpoint: POST /api/sharepoint-download
 * Body: { planoMidiaGrupo_pk: number }
 * 
 * Retorna: URL de download direto do arquivo
 */

const msal = require('@azure/msal-node');
const axios = require('axios');

// Configuração do Azure AD e SharePoint
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || "521338e4-1985-4bc5-be73-fabc0305ffb1";
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID || "a7cf9191-9aa0-4abf-9d0e-fede5d44badc";
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;

const SHAREPOINT_SITE_URL = process.env.SHAREPOINT_SITE_URL || "https://be180.sharepoint.com/sites/colmeia";
const SHAREPOINT_LIBRARY_NAME = process.env.SHAREPOINT_LIBRARY_NAME || "colmeia_powerBiExcel";
const SHAREPOINT_LIBRARY_ID = process.env.SHAREPOINT_LIBRARY_ID || "986c6f5f-ed4f-4ca4-b5f8-c4a05524abe0";

/**
 * Obtém token de acesso do Microsoft Graph
 */
async function getAccessToken() {
  try {
    const msalConfig = {
      auth: {
        clientId: AZURE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${AZURE_TENANT_ID}`,
        clientSecret: AZURE_CLIENT_SECRET
      }
    };

    const cca = new msal.ConfidentialClientApplication(msalConfig);
    
    const tokenRequest = {
      scopes: ['https://graph.microsoft.com/.default']
    };

    const response = await cca.acquireTokenByClientCredential(tokenRequest);
    
    if (!response || !response.accessToken) {
      throw new Error('Failed to acquire access token');
    }

    return response.accessToken;
  } catch (error) {
    console.error('❌ Erro ao obter token:', error);
    throw error;
  }
}

/**
 * Busca arquivo no SharePoint por planoMidiaGrupo_pk
 */
async function findFileByPlanoMidiaGrupo(accessToken, planoMidiaGrupo_pk) {
  try {
    // Converter URL do site para formato Graph API
    const sitePath = SHAREPOINT_SITE_URL.replace("https://", "");
    const siteIdForGraph = sitePath.replace("/", ":/", 1);

    // 1. Obter Site ID
    const siteUrl = `https://graph.microsoft.com/v1.0/sites/${siteIdForGraph}`;
    const siteResponse = await axios.get(siteUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    const siteId = siteResponse.data.id;
    console.log('✅ Site ID obtido:', siteId);

    // 2. Obter List ID pelo nome
    const listsUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists?$filter=displayName eq '${SHAREPOINT_LIBRARY_NAME}'`;
    const listsResponse = await axios.get(listsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!listsResponse.data.value || listsResponse.data.value.length === 0) {
      throw new Error(`Lista '${SHAREPOINT_LIBRARY_NAME}' não encontrada`);
    }

    const listId = listsResponse.data.value[0].id;
    console.log('✅ List ID obtido:', listId);

    // 3. Buscar arquivo por planoMidiaGrupo_pk
    const itemsUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?$expand=fields&$filter=fields/planoMidiaGrupo_pk eq ${planoMidiaGrupo_pk}&$top=1`;
    
    console.log('🔍 Buscando arquivo com planoMidiaGrupo_pk:', planoMidiaGrupo_pk);

    const itemsResponse = await axios.get(itemsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Prefer': 'HonorNonIndexedQueriesWarningMayFailRandomly'
      }
    });

    // Se não encontrar com orderby, tentar sem
    if (!itemsResponse.data.value || itemsResponse.data.value.length === 0) {
      console.log('⚠️ Tentando busca sem filtro de ordenação...');
      
      const simpleItemsUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?$expand=fields&$filter=fields/planoMidiaGrupo_pk eq ${planoMidiaGrupo_pk}&$top=1`;
      
      const retryResponse = await axios.get(simpleItemsUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (!retryResponse.data.value || retryResponse.data.value.length === 0) {
        return null;
      }

      const item = retryResponse.data.value[0];
      return await getDownloadInfo(accessToken, siteId, listId, item);
    }

    const item = itemsResponse.data.value[0];
    return await getDownloadInfo(accessToken, siteId, listId, item);

  } catch (error) {
    console.error('❌ Erro ao buscar arquivo:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Obtém informações de download do arquivo
 */
async function getDownloadInfo(accessToken, siteId, listId, item) {
  try {
    const fields = item.fields || {};
    const itemId = item.id;

    // Obter URL de download direto
    const downloadUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items/${itemId}/driveItem/content`;

    console.log('✅ Arquivo encontrado:', fields.FileLeafRef);
    
    return {
      id: itemId,
      fileName: fields.FileLeafRef,
      title: fields.Title,
      planoMidiaGrupo_pk: fields.planoMidiaGrupo_pk,
      created: fields.Created,
      modified: fields.Modified,
      webUrl: item.webUrl,
      downloadUrl: downloadUrl
    };
  } catch (error) {
    console.error('❌ Erro ao obter info de download:', error);
    throw error;
  }
}

/**
 * Handler principal da API
 */
module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Validar método
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Método não permitido. Use POST.'
    });
  }

  try {
    // Validar parâmetros
    const { planoMidiaGrupo_pk } = req.body;

    if (!planoMidiaGrupo_pk) {
      return res.status(400).json({
        success: false,
        message: 'Parâmetro planoMidiaGrupo_pk é obrigatório'
      });
    }

    // Validar configuração
    if (!AZURE_CLIENT_SECRET) {
      console.error('❌ AZURE_CLIENT_SECRET não configurado');
      return res.status(500).json({
        success: false,
        message: 'Configuração do Azure não encontrada. Verifique as variáveis de ambiente.'
      });
    }

    console.log('🚀 Iniciando busca no SharePoint...');
    console.log('📊 planoMidiaGrupo_pk:', planoMidiaGrupo_pk);

    // 1. Obter token de acesso
    console.log('🔑 Obtendo token de acesso...');
    const accessToken = await getAccessToken();

    // 2. Buscar arquivo
    console.log('🔍 Buscando arquivo no SharePoint...');
    const fileInfo = await findFileByPlanoMidiaGrupo(accessToken, planoMidiaGrupo_pk);

    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        message: `Nenhum arquivo encontrado para planoMidiaGrupo_pk = ${planoMidiaGrupo_pk}`
      });
    }

    // 3. Obter conteúdo do arquivo
    console.log('📥 Obtendo conteúdo do arquivo...');
    const fileResponse = await axios.get(fileInfo.downloadUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      responseType: 'arraybuffer'
    });

    // 4. Retornar arquivo para download
    console.log('✅ Enviando arquivo para cliente...');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.fileName}"`);
    res.setHeader('Content-Length', fileResponse.data.length);
    
    return res.status(200).send(Buffer.from(fileResponse.data));

  } catch (error) {
    console.error('💥 Erro no processamento:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar arquivo no SharePoint',
      error: error.message,
      details: error.response?.data || null
    });
  }
};

