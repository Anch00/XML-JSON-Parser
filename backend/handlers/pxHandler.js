const path = require("path");
const { loadPXFileSync } = require("../lib/pxParser");

const PX_PATH = path.join(__dirname, "..", "..", "data", "prenocitvene.px");
let cache = null;

function ensureLoaded() {
  if (!cache) {
    cache = loadPXFileSync(PX_PATH);
  }
  return cache;
}

// GET /api/px/meta
function getPXMeta(req, res) {
  try {
    const px = ensureLoaded();
    // Normalize stubValues so keys are exactly stubNames and arrays are present
    const normalizedStubValues = {};
    const rawStubValues = px.stubValues || {};
    const rawValues = px.values || {};
    const rawValuesEn = px.values_en || {};
    for (let i = 0; i < px.stubNames.length; i++) {
      const key = px.stubNames[i];
      // prefer rawStubValues[key], then rawValues[key], then rawValuesEn[key], then fallback by index
      let arr = rawStubValues[key];
      if (!arr || !arr.length) arr = rawValues[key];
      if (!arr || !arr.length) arr = rawValuesEn[key];
      if (!arr || !arr.length) arr = Object.values(rawStubValues)[i] || [];
      normalizedStubValues[key] = arr || [];
    }

    // heading values - prefer headingValues, else try headingNames mapped values
    let headingValues = px.headingValues || [];
    if (
      (!headingValues || !headingValues.length) &&
      px.headingNames &&
      px.headingNames.length
    ) {
      const hname = px.headingNames[0];
      headingValues =
        (px.values && px.values[hname]) ||
        (px.values_en && px.values_en[hname]) ||
        [];
    }

    res.json({
      stubNames: px.stubNames,
      headingNames: px.headingNames,
      stubValues: normalizedStubValues,
      headingValues,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/px/series?destination=SLOVENIJA&est=0%20Nastanitveni%20obrat%20-%20SKUPAJ&measure=Bedplaces%20-%20TOTAL
function getPXSeries(req, res) {
  try {
    const px = ensureLoaded();
    const { destination, est, measure, measureIndex, destIndex, estIndex } =
      req.query;

    // stubNames order in file: ["LETO","TURISTI�NA MAKRO DESTINACIJA","NASTANITVENI OBRAT"]
    const yearDim = px.stubNames[0];
    const destDim = px.stubNames[1];
    const estDim = px.stubNames[2];

    // Build years/dests/ests robustly using available parsed maps
    const years =
      px.stubValues && px.stubValues[yearDim] && px.stubValues[yearDim].length
        ? px.stubValues[yearDim]
        : (px.values && px.values[yearDim]) ||
          (px.values_en && px.values_en[yearDim]) ||
          Object.values(px.stubValues || {})[0] ||
          [];
    const dests =
      px.stubValues && px.stubValues[destDim] && px.stubValues[destDim].length
        ? px.stubValues[destDim]
        : (px.values && px.values[destDim]) ||
          (px.values_en && px.values_en[destDim]) ||
          Object.values(px.stubValues || {})[1] ||
          [];
    const ests =
      px.stubValues && px.stubValues[estDim] && px.stubValues[estDim].length
        ? px.stubValues[estDim]
        : (px.values && px.values[estDim]) ||
          (px.values_en && px.values_en[estDim]) ||
          Object.values(px.stubValues || {})[2] ||
          [];

    // determine headingValues with fallbacks
    let headingValues = px.headingValues || [];
    if (
      (!headingValues || !headingValues.length) &&
      px.headingNames &&
      px.headingNames.length
    ) {
      const hname = px.headingNames[0];
      headingValues =
        (px.values && px.values[hname]) ||
        (px.values_en && px.values_en[hname]) ||
        [];
    }

    const defaultMeasureIndex =
      headingValues && headingValues.length > 1 ? 1 : 0;

    const mIdx =
      measureIndex != null && !isNaN(Number(measureIndex))
        ? Number(measureIndex)
        : measure
        ? headingValues.indexOf(measure)
        : defaultMeasureIndex;
    const dIdx =
      destIndex != null && !isNaN(Number(destIndex))
        ? Number(destIndex)
        : destination
        ? dests.indexOf(destination)
        : dests.indexOf("SLOVENIJA");
    const eIdx =
      estIndex != null && !isNaN(Number(estIndex))
        ? Number(estIndex)
        : est
        ? ests.indexOf(est)
        : ests.indexOf("0 Nastanitveni obrat - SKUPAJ");

    if (mIdx < 0 || dIdx < 0 || eIdx < 0) {
      return res.status(400).json({
        error:
          "Invalid query parameters (measure/destination/establishment not found)",
      });
    }

    // Data layout: rows iterate over all combinations of stubs in the order they appear (LETO, DEST, EST)
    // For each combination there are colsCount heading values.
    // So rowIndex = (i_LETO * (D*E)) + (i_DEST * (E)) + (i_EST)
    const D = dests.length;
    const E = ests.length;

    const series = [];
    for (let yi = 0; yi < years.length; yi++) {
      const rowIndex = yi * (D * E) + dIdx * E + eIdx;
      const value =
        px.data[rowIndex] && px.data[rowIndex][mIdx] != null
          ? px.data[rowIndex][mIdx]
          : null;
      series.push({ year: years[yi], value });
    }

    res.json({
      series,
      meta: {
        years,
        measure: headingValues[mIdx],
        destination: dests[dIdx],
        establishment: ests[eIdx],
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getPXMeta, getPXSeries };
