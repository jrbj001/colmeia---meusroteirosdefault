const axios = require('axios');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const GOOGLE_API_KEYS = [
  'GOOGLE_MAPS_API_KEY',
  'GOOGLE_GEOCODING_API_KEY',
  'GOOGLE_API_KEY',
  'MAPS_API_KEY',
];

const getGoogleApiKey = () => {
  for (const key of GOOGLE_API_KEYS) {
    if (process.env[key]) {
      return process.env[key];
    }
  }
  return null;
};

const buildAddressString = (row) => {
  const parts = [];

  const street = row.rua || row.logradouro || row.endereco || row.street || row.address || '';
  const number = row.numero || row.number || row.num || '';
  const neighborhood = row.bairro || row.neighborhood || '';
  const city = row.cidade || row.city || row.municipio || '';
  const state = row.estado || row.state || row.uf || '';
  const postalCode = row.cep || row.postalCode || row.zip || '';
  const country = row.pais || row.country || 'Brasil';

  if (street) parts.push(number ? `${street}, ${number}` : street);
  if (neighborhood) parts.push(neighborhood);
  if (city) parts.push(city);
  if (state) parts.push(state);
  if (postalCode) parts.push(postalCode);
  if (country) parts.push(country);

  return parts.join(', ');
};

const forwardGeocodeGoogle = async (address, apiKey) => {
  const url = 'https://maps.googleapis.com/maps/api/geocode/json';

  const response = await axios.get(url, {
    params: {
      address,
      key: apiKey,
      language: 'pt-BR',
      region: 'br',
    },
    timeout: 15000,
  });

  const data = response.data;

  if (data.status !== 'OK' || !data.results?.length) {
    throw new Error(
      data.error_message || `Google Geocoding retornou status ${data.status}`,
    );
  }

  const result = data.results[0];
  const location = result.geometry?.location;
  const components = result.address_components || [];

  const getComponent = (type) =>
    components.find((c) => c.types.includes(type))?.long_name || '';

  return {
    latitude: location?.lat ?? null,
    longitude: location?.lng ?? null,
    formattedAddress: result.formatted_address || '',
    neighborhood:
      getComponent('sublocality_level_1') || getComponent('neighborhood'),
    city:
      getComponent('administrative_area_level_2') || getComponent('locality'),
    state: getComponent('administrative_area_level_1'),
    postalCode: getComponent('postal_code'),
    locationType: result.geometry?.location_type || '',
    source: 'google',
  };
};

const forwardGeocodeNominatim = async (address) => {
  const url = 'https://nominatim.openstreetmap.org/search';

  const response = await axios.get(url, {
    params: {
      q: address,
      format: 'json',
      addressdetails: 1,
      limit: 1,
      countrycodes: 'br',
    },
    headers: {
      'User-Agent': 'colmeia-meusroteirosdefault/1.0 (+https://colmeia.dev)',
      Accept: 'application/json',
    },
    timeout: 15000,
  });

  const data = response.data;

  if (!data?.length) {
    throw new Error('Nominatim não encontrou resultados para o endereço');
  }

  const result = data[0];
  const addr = result.address || {};

  return {
    latitude: parseFloat(result.lat),
    longitude: parseFloat(result.lon),
    formattedAddress: result.display_name || '',
    neighborhood:
      addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || '',
    city:
      addr.city || addr.town || addr.village || addr.municipality || '',
    state: addr.state || addr.region || '',
    postalCode: addr.postcode || '',
    locationType: result.type || '',
    source: 'nominatim',
  };
};

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({
        success: false,
        message: 'Método não permitido. Utilize POST.',
      });
    }

    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: 'O corpo da requisição deve conter um array "rows" com endereços.',
      });
    }

    const googleApiKey = getGoogleApiKey();
    const provider = googleApiKey ? 'google' : 'nominatim';

    const invalidRows = [];
    const validRows = [];

    rows.forEach((row, index) => {
      const id = row.id ?? index;
      const address = buildAddressString(row);

      if (!address || address.replace(/,\s*/g, '').trim().length < 3) {
        invalidRows.push({
          id,
          address: address || '',
          reason: 'Endereço vazio ou insuficiente para geocodificação',
        });
        return;
      }

      validRows.push({ id, address, original: row });
    });

    if (!validRows.length) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum endereço válido foi enviado.',
        invalidRows,
      });
    }

    const cache = new Map();
    const uniqueEntries = [];

    validRows.forEach((row) => {
      const key = row.address.toLowerCase().trim();

      if (!cache.has(key)) {
        cache.set(key, {
          address: row.address,
          ids: new Set(),
        });
        uniqueEntries.push(key);
      }

      cache.get(key).ids.add(row.id);
    });

    const resultsById = {};
    const errors = [];

    for (const key of uniqueEntries) {
      const entry = cache.get(key);
      let geocoded;

      try {
        if (provider === 'google') {
          geocoded = await forwardGeocodeGoogle(entry.address, googleApiKey);
        } else {
          geocoded = await forwardGeocodeNominatim(entry.address);
        }

        await sleep(provider === 'google' ? 50 : 250);
      } catch (error) {
        console.error(
          `[busca-coordenada] Falha ao geocodificar "${entry.address}":`,
          error.message,
        );
        errors.push({
          address: entry.address,
          reason: error.message || 'Erro ao consultar serviço de geocodificação',
        });
        continue;
      }

      entry.ids.forEach((id) => {
        resultsById[id] = {
          id,
          addressInput: entry.address,
          ...geocoded,
        };
      });
    }

    const enrichedResults = validRows
      .map((row) => resultsById[row.id])
      .filter(Boolean);

    return res.json({
      success: errors.length === 0,
      provider,
      meta: {
        totalRows: rows.length,
        validRows: validRows.length,
        invalidRows: invalidRows.length,
        enrichedRows: enrichedResults.length,
        uniqueAddresses: uniqueEntries.length,
        provider,
      },
      results: enrichedResults,
      invalidRows,
      errors,
    });
  } catch (error) {
    console.error('[busca-coordenada] Erro inesperado:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao buscar coordenadas',
      error: error.message,
    });
  }
};
