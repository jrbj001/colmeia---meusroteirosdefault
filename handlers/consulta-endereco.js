const axios = require('axios');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const GOOGLE_API_KEYS = [
  'GOOGLE_MAPS_API_KEY',
  'GOOGLE_GEOCODING_API_KEY',
  'GOOGLE_API_KEY',
  'MAPS_API_KEY',
];

const formatCoordinate = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
};

const normalizeCoordinate = (value, type) => {
  const parsed = formatCoordinate(value);
  if (parsed === null) {
    return null;
  }

  const limit = type === 'lat' ? 90 : 180;
  if (Math.abs(parsed) <= limit) {
    return parsed;
  }

  // Muitos arquivos fornecem coordenadas multiplicadas por 10³, 10⁴, 10⁵ ou 10⁶.
  const factors = [1e3, 1e4, 1e5, 1e6];
  for (const factor of factors) {
    const scaled = parsed / factor;
    if (Math.abs(scaled) <= limit) {
      return scaled;
    }
  }

  return null;
};

const sanitizeKey = (lat, lng, precision = 6) => {
  if (lat === null || lng === null) {
    return null;
  }
  return `${lat.toFixed(precision)},${lng.toFixed(precision)}`;
};

const reverseGeocodeGoogle = async (lat, lng, apiKey) => {
  const url = 'https://maps.googleapis.com/maps/api/geocode/json';

  const response = await axios.get(url, {
    params: {
      latlng: `${lat},${lng}`,
      key: apiKey,
      language: 'pt-BR',
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
  const components = result.address_components || [];

  const getComponent = (type) =>
    components.find((component) => component.types.includes(type))?.long_name ||
    '';

  return {
    formattedAddress: result.formatted_address || '',
    street: getComponent('route'),
    number: getComponent('street_number'),
    neighborhood:
      getComponent('sublocality_level_1') || getComponent('neighborhood'),
    city:
      getComponent('administrative_area_level_2') || getComponent('locality'),
    state: getComponent('administrative_area_level_1'),
    country: getComponent('country'),
    postalCode: getComponent('postal_code'),
    locationType: result.geometry?.location_type || '',
    source: 'google',
  };
};

const reverseGeocodeNominatim = async (lat, lng) => {
  const url = 'https://nominatim.openstreetmap.org/reverse';

  const response = await axios.get(url, {
    params: {
      lat,
      lon: lng,
      format: 'json',
      addressdetails: 1,
      zoom: 18,
    },
    headers: {
      'User-Agent': 'colmeia-meusroteirosdefault/1.0 (+https://colmeia.dev)',
      Accept: 'application/json',
    },
    timeout: 15000,
  });

  const data = response.data;

  if (!data || !data.address) {
    throw new Error('Nominatim não retornou dados de endereço');
  }

  const address = data.address;

  return {
    formattedAddress: data.display_name || '',
    street:
      address.road ||
      address.pedestrian ||
      address.cycleway ||
      address.footway ||
      '',
    number: address.house_number || '',
    neighborhood:
      address.suburb ||
      address.neighbourhood ||
      address.quarter ||
      address.city_district ||
      '',
    city:
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      '',
    state: address.state || address.region || '',
    country: address.country || '',
    postalCode: address.postcode || '',
    locationType: data.type || '',
    source: 'nominatim',
  };
};

const getGoogleApiKey = () => {
  for (const key of GOOGLE_API_KEYS) {
    if (process.env[key]) {
      return process.env[key];
    }
  }
  return null;
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
        message: 'O corpo da requisição deve conter um array "rows" com coordenadas.',
      });
    }

    const googleApiKey = getGoogleApiKey();
    const provider = googleApiKey ? 'google' : 'nominatim';

    const invalidRows = [];
    const validRows = [];

    rows.forEach((row, index) => {
      const id = row.id ?? index;
      const rawLat = row.latitude ?? row.lat ?? row.Latitude;
      const rawLng =
        row.longitude ??
        row.lon ??
        row.lng ??
        row.Longitude ??
        row.Lon ??
        row.Lng;

      const lat = normalizeCoordinate(rawLat, 'lat');
      const lng = normalizeCoordinate(rawLng, 'lng');

      if (lat === null || lng === null) {
        invalidRows.push({
          id,
          latitude: rawLat ?? null,
          longitude: rawLng ?? null,
          reason:
            lat === null && lng === null
              ? 'Coordenadas inválidas ou fora da faixa esperada'
              : lat === null
              ? 'Latitude inválida ou fora da faixa esperada'
              : 'Longitude inválida ou fora da faixa esperada',
        });
        return;
      }

      validRows.push({
        id,
        lat,
        lng,
      });
    });

    if (!validRows.length) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma coordenada válida foi enviada.',
        invalidRows,
      });
    }

    const cache = new Map();
    const uniqueEntries = [];

    validRows.forEach((row) => {
      const key = sanitizeKey(row.lat, row.lng);
      if (!key) {
        invalidRows.push({
          id: row.id,
          latitude: row.lat,
          longitude: row.lng,
          reason: 'Coordenadas inválidas',
        });
        return;
      }

      if (!cache.has(key)) {
        cache.set(key, {
          lat: row.lat,
          lng: row.lng,
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
          geocoded = await reverseGeocodeGoogle(entry.lat, entry.lng, googleApiKey);
        } else {
          geocoded = await reverseGeocodeNominatim(entry.lat, entry.lng);
        }

        // Pequena espera para respeitar limites de uso, especialmente no Nominatim
        await sleep(provider === 'google' ? 50 : 250);
      } catch (error) {
        console.error(
          `[consulta-endereco] Falha ao geocodificar ${entry.lat},${entry.lng}:`,
          error.message,
        );
        errors.push({
          latitude: entry.lat,
          longitude: entry.lng,
          reason: error.message || 'Erro ao consultar serviço de geocodificação',
        });
        continue;
      }

      entry.ids.forEach((id) => {
        resultsById[id] = {
          id,
          latitude: entry.lat,
          longitude: entry.lng,
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
        uniqueCoordinates: uniqueEntries.length,
        provider,
      },
      results: enrichedResults,
      invalidRows,
      errors,
    });
  } catch (error) {
    console.error('[consulta-endereco] Erro inesperado:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao consultar endereços',
      error: error.message,
    });
  }
};

