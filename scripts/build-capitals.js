import { readFileSync, writeFileSync } from "node:fs";

const sourcePath = "/private/tmp/ne_capitals.geojson";
const source = JSON.parse(readFileSync(sourcePath, "utf8"));

const capitals = source.features
  .filter((feature) => feature.properties.adm0cap === 1)
  .map((feature) => {
    const { adm0name, iso_a2, nameascii, name } = feature.properties;
    const [longitude, latitude] = feature.geometry.coordinates;
    const city = nameascii || name;
    return {
      country: adm0name,
      name: `${city}, ${adm0name}`,
      latitude: round(latitude),
      longitude: round(longitude),
      timezone: timezoneForCapital(iso_a2, longitude)
    };
  })
  .filter((capital) => capital.name && Number.isFinite(capital.latitude) && Number.isFinite(capital.longitude))
  .sort((a, b) => a.name.localeCompare(b.name));

capitals.push({
  country: "Israel",
  name: "Haifa, Israel",
  latitude: 32.794,
  longitude: 34.9896,
  timezone: "Asia/Jerusalem"
});

const uniqueCapitals = dedupeByName(capitals).sort((a, b) => a.name.localeCompare(b.name));

writeFileSync(
  "capitals.js",
  `export const presets = ${JSON.stringify(uniqueCapitals, null, 2)};\n\nexport const customPreset = {\n  name: "Custom Location",\n  latitude: 40.7128,\n  longitude: -74.006,\n  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"\n};\n`
);

function dedupeByName(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.name)) return false;
    seen.add(item.name);
    return true;
  });
}

function round(value) {
  return Number(value.toFixed(4));
}

function timezoneForCapital(isoA2, longitude) {
  const overrides = {
    IL: "Asia/Jerusalem",
    PS: "Asia/Gaza",
    GB: "Europe/London",
    IE: "Europe/Dublin",
    IS: "Atlantic/Reykjavik",
    PT: "Europe/Lisbon",
    ES: "Europe/Madrid",
    FR: "Europe/Paris",
    DE: "Europe/Berlin",
    IT: "Europe/Rome",
    VA: "Europe/Rome",
    NL: "Europe/Amsterdam",
    BE: "Europe/Brussels",
    CH: "Europe/Zurich",
    AT: "Europe/Vienna",
    DK: "Europe/Copenhagen",
    NO: "Europe/Oslo",
    SE: "Europe/Stockholm",
    FI: "Europe/Helsinki",
    GR: "Europe/Athens",
    TR: "Europe/Istanbul",
    RU: "Europe/Moscow",
    US: "America/New_York",
    CA: "America/Toronto",
    MX: "America/Mexico_City",
    BR: "America/Sao_Paulo",
    AR: "America/Argentina/Buenos_Aires",
    CL: "America/Santiago",
    PE: "America/Lima",
    CO: "America/Bogota",
    VE: "America/Caracas",
    UY: "America/Montevideo",
    CN: "Asia/Shanghai",
    JP: "Asia/Tokyo",
    KR: "Asia/Seoul",
    IN: "Asia/Kolkata",
    PK: "Asia/Karachi",
    BD: "Asia/Dhaka",
    TH: "Asia/Bangkok",
    VN: "Asia/Ho_Chi_Minh",
    ID: "Asia/Jakarta",
    PH: "Asia/Manila",
    SG: "Asia/Singapore",
    AU: "Australia/Sydney",
    NZ: "Pacific/Auckland",
    EG: "Africa/Cairo",
    ZA: "Africa/Johannesburg",
    KE: "Africa/Nairobi",
    NG: "Africa/Lagos"
  };

  if (overrides[isoA2]) return overrides[isoA2];

  const offset = Math.max(-12, Math.min(14, Math.round(longitude / 15)));
  if (offset === 0) return "UTC";
  return `Etc/GMT${offset > 0 ? "-" : "+"}${Math.abs(offset)}`;
}
