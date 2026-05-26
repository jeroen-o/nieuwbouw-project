// ============================================================
// IBL Engine — Pure JS module
// Geëxtraheerd uit App.jsx van de losse IBL-rekentool, conform Rekenregels IBL 8.1.1
// Bevat: PDF-parsing, contract-voorbewerking, beslisboom A/B/C/D, sanity checks
// ============================================================

// ============================================================
// CONSTANTS — IBL Rekenregels 8.1.1
// ============================================================

// Vaste Contracten (Appendix 6)
const VASTE_CONTRACTVORMEN = [
  'schriftelijke arbeidsovereenkomst voor onbepaalde tijd, geen oproepovereenkomst',
  'niet schriftelijke arbeidsovereenkomst voor onbepaalde tijd, geen oproepovereenkomst',
  'publiekrechtelijke aanstelling voor onbepaalde tijd',
];

// Niet-Vaste Contracten (Appendix 6)
const NIET_VASTE_CONTRACTVORMEN = [
  'schriftelijke arbeidsovereenkomst voor onbepaalde tijd, oproepovereenkomst',
  'niet schriftelijke arbeidsovereenkomst voor onbepaalde tijd, oproepovereenkomst',
  'schriftelijke arbeidsovereenkomst voor bepaalde tijd, geen oproepovereenkomst',
  'schriftelijke arbeidsovereenkomst voor bepaalde tijd, oproepovereenkomst',
  'niet schriftelijke arbeidsovereenkomst voor bepaalde tijd, geen oproepovereenkomst',
  'niet schriftelijke arbeidsovereenkomst voor bepaalde tijd, oproepovereenkomst',
  'publiekrechtelijke aanstelling voor bepaalde tijd',
];

// Oproepovereenkomsten (subset — rekenregels Appendix 2: pensioenbijdrage uitsluiten)
const OPROEP_CONTRACTVORMEN = [
  'schriftelijke arbeidsovereenkomst voor onbepaalde tijd, oproepovereenkomst',
  'niet schriftelijke arbeidsovereenkomst voor onbepaalde tijd, oproepovereenkomst',
  'schriftelijke arbeidsovereenkomst voor bepaalde tijd, oproepovereenkomst',
  'niet schriftelijke arbeidsovereenkomst voor bepaalde tijd, oproepovereenkomst',
];

// UWV Loonheffingennummers (Bijlage Loonheffingennummers)
const UWV_LOONHEFFINGENNUMMERS = [
  '810220350L02', '810220350L04', '810220350L20',
  '810220350L23', '810220350L26', '810220350L53',
];

// UWV Uitkering-omschrijvingen (Appendix 5)
const UWV_UITKERING_OMSCHRIJVINGEN = [
  'Ziektewet- of WAZO-Uitkering van UWV',
  'WAO-Uitkering van UWV',
  'WW-Uitkering van UWV',
  'WAZ-Uitkering van UWV',
  'WAO- en Wajong-Uitkering van UWV',
  'WIA (IVA)-Uitkering van UWV',
  'WIA (WGA)-Uitkering van UWV',
  'Toeslag bij Uitkering (TW) van UWV',
  'IOW-Uitkering van UWV',
  'UWV; Loondoorbetaling bij faillissement',
];

// API Foutcodes (Bijlage Foutcodes API spec v10)
const API_FOUTCODES = {
  2001: 'Burgerservicenummer aangetroffen, PDF kan niet verwerkt worden',
  2002: 'Naam is niet gelijk op elke pagina',
  2014: 'Kan werkgever/instantie niet vinden',
  2029: 'Ontbrekende of ongeldige header voor tabel met loongegevens',
  2030: 'Geen berekening mogelijk. Indien er sprake is van een negatief aantal uren in de afgelopen 4 maanden of 5 vierwekelijkse perioden kan er geen correcte berekening van het uren- en of parttimepercentage worden vastgesteld.',
  2032: 'VZB-versie wordt niet ondersteund',
  2033: 'De downloaddatum komt niet overeen met de VZB-versie',
  2034: 'Ongeldige waarde voor gewerkte uren',
  2035: 'Ongeldige downloaddatum. De datum mag niet in de toekomst liggen',
  2036: 'Ongeldige periode voor loonitem, een loonitem mag niet meer dan 3 periodes in de toekomst liggen',
  2037: 'Loonheffingennummer komt niet overeen met een geldige UWV uitkering.',
  2038: 'Het Verzekeringsbericht bevat geen contracten die in aanmerking komen voor een IBL-berekening',
  8920: 'Geen geldig certificaat in het UWV-verzekeringsbericht',
  8988: 'Certificaat verificatie mislukt',
};

// Koppeltabel maandelijks → vierwekelijks (Bijlage Koppeltabel)
// Key: 'YYYY-MM' (maandelijkse), Value: vierwekelijkse Datumreeks string
const KOPPELTABEL_MAAND_NAAR_4WK = {
  '2026-12': '30-11-2026 t/m 31-12-2026', '2026-11': '02-11-2026 t/m 29-11-2026',
  '2026-10': '05-10-2026 t/m 01-11-2026', '2026-09': '07-09-2026 t/m 04-10-2026',
  '2026-08': '10-08-2026 t/m 06-09-2026', '2026-07': '13-07-2026 t/m 09-08-2026',
  '2026-06': '15-06-2026 t/m 12-07-2026', '2026-05': '20-04-2026 t/m 17-05-2026',
  '2026-04': '23-03-2026 t/m 19-04-2026', '2026-03': '23-02-2026 t/m 22-03-2026',
  '2026-02': '26-01-2026 t/m 22-02-2026', '2026-01': '01-01-2026 t/m 25-01-2026',
  '2025-12': '01-12-2025 t/m 31-12-2025', '2025-11': '03-11-2025 t/m 30-11-2025',
  '2025-10': '06-10-2025 t/m 02-11-2025', '2025-09': '08-09-2025 t/m 05-10-2025',
  '2025-08': '11-08-2025 t/m 07-09-2025', '2025-07': '14-07-2025 t/m 10-08-2025',
  '2025-06': '19-05-2025 t/m 15-06-2025', '2025-05': '21-04-2025 t/m 18-05-2025',
  '2025-04': '24-03-2025 t/m 20-04-2025', '2025-03': '24-02-2025 t/m 23-03-2025',
  '2025-02': '27-01-2025 t/m 23-02-2025', '2025-01': '01-01-2025 t/m 26-01-2025',
  '2024-12': '02-12-2024 t/m 31-12-2024', '2024-11': '04-11-2024 t/m 01-12-2024',
  '2024-10': '07-10-2024 t/m 03-11-2024', '2024-09': '09-09-2024 t/m 06-10-2024',
  '2024-08': '12-08-2024 t/m 08-09-2024', '2024-07': '15-07-2024 t/m 11-08-2024',
  '2024-06': '20-05-2024 t/m 16-06-2024', '2024-05': '22-04-2024 t/m 19-05-2024',
  '2024-04': '25-03-2024 t/m 21-04-2024', '2024-03': '26-02-2024 t/m 24-03-2024',
  '2024-02': '29-01-2024 t/m 25-02-2024', '2024-01': '01-01-2024 t/m 28-01-2024',
  '2023-12': '04-12-2023 t/m 31-12-2023', '2023-11': '06-11-2023 t/m 03-12-2023',
  '2023-10': '09-10-2023 t/m 05-11-2023', '2023-09': '11-09-2023 t/m 08-10-2023',
  '2023-08': '14-08-2023 t/m 10-09-2023', '2023-07': '19-06-2023 t/m 16-07-2023',
  '2023-06': '22-05-2023 t/m 18-06-2023', '2023-05': '24-04-2023 t/m 21-05-2023',
  '2023-04': '27-03-2023 t/m 23-04-2023', '2023-03': '27-02-2023 t/m 26-03-2023',
  '2023-02': '30-01-2023 t/m 26-02-2023', '2023-01': '01-01-2023 t/m 29-01-2023',
};

// API versies
const API_VERSIE = '10.0.0.0';
const REKENREGELS_VERSIE = '8.1.1';
const FRONTEND_API_VERSIE = '9.1.0.1';

// Een Contractvorm wordt herkend als oproepovereenkomst
const isOproepContractvorm = (cv) => {
  if (!cv) return false;
  return /oproepovereenkomst/i.test(cv) && !/geen\s+oproepovereenkomst/i.test(cv);
};

// ============================================================
// HELPERS
// ============================================================

const fmtEur = (n) => {
  if (typeof n !== 'number' || isNaN(n)) return '€ 0,00';
  return '€ ' + Math.abs(n).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (n < 0 ? '-' : '');
};

const fmtEurShort = (n) => {
  if (typeof n !== 'number' || isNaN(n)) return '€ 0';
  return '€ ' + n.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const parseEurNL = (s) => {
  if (typeof s === 'number') return s;
  if (!s) return 0;
  const cleaned = String(s).replace(/[€\s]/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

const parsePeriode = (periodeStr) => {
  if (!periodeStr) return null;
  const m = String(periodeStr).match(/(\d{1,2})-(\d{1,2})-(\d{4})\s*t\/m\s*(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (!m) return null;
  return {
    start: new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1])),
    end: new Date(parseInt(m[6]), parseInt(m[5]) - 1, parseInt(m[4])),
  };
};

const monthsBetween = (d1, d2) =>
  (d1.getFullYear() - d2.getFullYear()) * 12 + (d1.getMonth() - d2.getMonth());

const sortLoonitems = (items) => [...items].sort((a, b) => {
  const pa = parsePeriode(a.periode);
  const pb = parsePeriode(b.periode);
  if (!pa || !pb) return 0;
  return pb.end - pa.end;
});

const isVastContractvorm = (cv) => {
  if (!cv) return false;
  const lc = cv.toLowerCase().trim();
  // Exact match against known vaste contractvormen
  if (VASTE_CONTRACTVORMEN.some(v => v.toLowerCase() === lc)) return true;
  // Heuristic for slight variations: "voor onbepaalde tijd" + "geen oproepovereenkomst"
  if (lc.includes('voor onbepaalde tijd') && lc.includes('geen oproepovereenkomst')) return true;
  if (lc.includes('publiekrechtelijke aanstelling voor onbepaalde tijd')) return true;
  return false;
};

// ============================================================
// PDF PARSER — verzekeringsbericht
// ============================================================

async function extractTextFromPdf(file) {
  if (!window.pdfjsLib) throw new Error('PDF.js not loaded');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Build lines based on Y position
    const items = content.items.map(it => ({
      str: it.str,
      x: it.transform[4],
      y: it.transform[5],
    }));
    // Group by approximate Y position (lines)
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    const lines = [];
    let currentLine = null;
    let currentY = null;
    for (const item of items) {
      if (currentY === null || Math.abs(currentY - item.y) > 2) {
        if (currentLine) lines.push(currentLine);
        currentLine = item.str;
        currentY = item.y;
      } else {
        currentLine += ' ' + item.str;
      }
    }
    if (currentLine) lines.push(currentLine);
    pages.push(lines.join('\n'));
  }
  return pages.join('\n\n');
}

function parseVerzekeringsbericht(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Find aanvrager naam + datum + geboortedatum
  let aanvragerNaam = '';
  let aanmaakdatum = null;
  let vzbVersie = '';
  let geboortedatum = null;
  let geslacht = null;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    // Naam: "De heer/mevrouw" + initiaal + achternaam (1 of meerdere woorden)
    // Plus alternatieve formaten: "Aanvrager: Naam", "Naam: A. Voorbeeld"
    if (!aanvragerNaam) {
      let naamMatch = l.match(/^(De\s+(?:heer|mevrouw)\s+[A-Z]\.(?:[A-Z]\.)?\s*(?:[a-z]+\s+)?[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/);
      if (!naamMatch) naamMatch = l.match(/^Aanvrager:\s*(.+)$/i);
      if (!naamMatch) naamMatch = l.match(/^Naam:\s*([A-Z]\.\s*[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/);
      // Compact "Dhr." or "Mw." formats
      if (!naamMatch) naamMatch = l.match(/^((?:Dhr\.|Mw\.|Mevr\.)\s*[A-Z]\.\s*[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/);
      if (naamMatch) aanvragerNaam = naamMatch[1].trim();
    }

    // Geslacht uit aanhef
    if (!geslacht) {
      if (/^De\s+heer\b|^Dhr\./i.test(l)) geslacht = 'man';
      else if (/^Mevrouw\b|^Mw\.|^Mevr\./i.test(l)) geslacht = 'vrouw';
    }

    // Geboortedatum: "Geboortedatum: 20-03-1971" of "Geboortedatum: 20 maart 1971"
    if (!geboortedatum) {
      let gbM = l.match(/Geboortedatum[:\s]+(\d{1,2})-(\d{1,2})-(\d{4})/i);
      if (gbM) {
        geboortedatum = new Date(parseInt(gbM[3]), parseInt(gbM[2]) - 1, parseInt(gbM[1]));
      } else {
        gbM = l.match(/Geboortedatum[:\s]+(\d{1,2})\s+(jan|feb|maart|mrt|apr|mei|juni|juli|aug|sep|sept|okt|nov|dec)\w*\s+(\d{4})/i);
        if (gbM) {
          const months = { jan:0,feb:1,maart:2,mrt:2,apr:3,mei:4,juni:5,juli:6,aug:7,sep:8,sept:8,okt:9,nov:10,dec:11 };
          const m = months[gbM[2].toLowerCase()];
          if (m !== undefined) geboortedatum = new Date(parseInt(gbM[3]), m, parseInt(gbM[1]));
        }
      }
      // ISO format
      if (!geboortedatum) {
        const iso = l.match(/Geboortedatum[:\s]+(\d{4})-(\d{1,2})-(\d{1,2})/i);
        if (iso) geboortedatum = new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]));
      }
    }

    // Datum: "Datum: 03 mei 2026" of "03-05-2026" of "Datum: 2026-05-03"
    if (!aanmaakdatum) {
      let datumMatch = l.match(/Datum:\s*(\d{1,2})\s+(jan|feb|maart|mrt|apr|mei|juni|juli|aug|sep|sept|okt|nov|dec)\w*\s+(\d{4})/i);
      if (datumMatch) {
        const months = { jan:0,feb:1,maart:2,mrt:2,apr:3,mei:4,juni:5,juli:6,aug:7,sep:8,sept:8,okt:9,nov:10,dec:11 };
        const m = months[datumMatch[2].toLowerCase()];
        if (m !== undefined) aanmaakdatum = new Date(parseInt(datumMatch[3]), m, parseInt(datumMatch[1]));
      } else {
        // Numeric format: "Datum: 03-05-2026"
        datumMatch = l.match(/Datum:\s*(\d{1,2})-(\d{1,2})-(\d{4})/);
        if (datumMatch) {
          aanmaakdatum = new Date(parseInt(datumMatch[3]), parseInt(datumMatch[2]) - 1, parseInt(datumMatch[1]));
        }
      }
      // ISO format
      if (!aanmaakdatum) {
        const iso = l.match(/Datum:\s*(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (iso) aanmaakdatum = new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]));
      }
    }

    // VZB-versie: VZB-006, VZB006, vzb_006 etc.
    if (!vzbVersie) {
      const vzbMatch = l.match(/VZB[-_\s]*(\d{3,})/i);
      if (vzbMatch) vzbVersie = `VZB-${vzbMatch[1]}`;
    }
  }

  // Find werkgever blocks. Each block starts with "Werkgever/Instantie X" and contains loonitems.
  // Strategy: find all matches of "Werkgever/Instantie ..." then take periods until next werkgever or end.

  const werkgeverIndices = [];
  for (let i = 0; i < lines.length; i++) {
    // Standard: "Werkgever/Instantie X"
    // Alt: "Werkgever:", "Werknemer/Inhoudingsplichtige", "Inhoudingsplichtige:"
    if (/^(Werkgever[\/\s:]|Werkgever\/Instantie|Inhoudingsplichtige[:\s])/i.test(lines[i])) {
      werkgeverIndices.push(i);
    }
  }

  // Group werkgevers by (naam + loonheffingennummer + contractvorm) so duplicate headers across pages merge
  const werkgeverMap = new Map();

  for (let wi = 0; wi < werkgeverIndices.length; wi++) {
    const startIdx = werkgeverIndices[wi];
    const endIdx = wi + 1 < werkgeverIndices.length ? werkgeverIndices[wi + 1] : lines.length;
    const block = lines.slice(startIdx, endIdx);

    // Parse header
    let naam = '';
    let loonheffingennummer = '';
    let verzekerdeWetten = '';
    let contractvorm = '';

    for (let i = 0; i < block.length; i++) {
      const l = block[i];
      const naamM = l.match(/^(?:Werkgever\/Instantie|Werkgever[:\s]|Inhoudingsplichtige[:\s])\s*(.+)$/i);
      if (naamM) naam = naamM[1].trim();
      const lhM = l.match(/^Loonheffingennummer[:\s]+(\S+)/i);
      if (lhM) loonheffingennummer = lhM[1].trim();
      const vwM = l.match(/^Verzekerde\s+wetten[:\s]+(.+)$/i);
      if (vwM) verzekerdeWetten = vwM[1].trim();
      const cvM = l.match(/^Contractvorm[:\s]+(.+)$/i);
      if (cvM) {
        contractvorm = cvM[1].trim();
        // Wrap-around: contractvorm may span multiple lines
        let j = i + 1;
        while (j < block.length) {
          const nextLine = block[j];
          if (/^(Periode|Aantal|Werkgever\/|Loonheffing|Verzekerde|\d{2}-\d{2}-\d{4})/i.test(nextLine)) break;
          contractvorm += ' ' + nextLine.trim();
          j++;
          if (j - i > 3) break; // safety: max 3 wrap lines
        }
        contractvorm = contractvorm.replace(/\s+/g, ' ').trim();
      }
    }

    if (!naam) continue;

    const key = `${naam}|${loonheffingennummer}|${contractvorm}`;
    let werkgever = werkgeverMap.get(key);
    if (!werkgever) {
      werkgever = {
        id: `WG${String(werkgeverMap.size + 1).padStart(3, '0')}`,
        naam,
        loonheffingennummer,
        verzekerdeWetten,
        contractvorm,
        isUitkering: UWV_LOONHEFFINGENNUMMERS.includes(loonheffingennummer),
        loonitems: [],
      };
      werkgeverMap.set(key, werkgever);
    }

    // Parse loonitems within this block.
    // PDF can produce two layouts:
    // Format A (pdfplumber-style): "Eigen bijdrage auto Waarde privégebruik auto" on one line + "€ X € Y" on next
    // Format B: each label on own line, each amount on own line
    // The strategy: detect Format A first via combined-label line, then fallback to Format B.

    for (let i = 0; i < block.length; i++) {
      const periodMatch = block[i].match(
        /^(\d{2}-\d{2}-\d{4})\s*t\/m\s*(\d{2}-\d{2}-\d{4})\s+(\d+(?:[,.]\d+)?)(?:\s+€\s*([\d.,]+))?\s*$/
      );
      if (!periodMatch) continue;

      const periode = `${periodMatch[1]} t/m ${periodMatch[2]}`;
      const uren = parseFloat(periodMatch[3].replace(',', '.'));
      let svLoon = periodMatch[4] ? parseEurNL(periodMatch[4]) : 0;
      let eigenBijdrageAuto = 0;
      let waardePrivegebruikAuto = 0;

      // Collect lookahead lines until next period/werkgever
      const lookaheadLines = [];
      for (let j = i + 1; j < block.length; j++) {
        const line = block[j];
        if (/^\d{2}-\d{2}-\d{4}\s*t\/m/.test(line)) break;
        if (/^Werkgever\/Instantie/i.test(line)) break;
        if (/^(Periode|Aantal|Loonheffing|Verzekerde|Contractvorm)/i.test(line)) break;
        lookaheadLines.push(line);
        if (lookaheadLines.length >= 8) break;
      }

      // Detect Format A: a line containing BOTH labels
      let formatADetected = false;
      for (let j = 0; j < lookaheadLines.length - 1; j++) {
        const line = lookaheadLines[j];
        if (/Eigen\s+bijdrage\s+auto/i.test(line) && /Waarde\s+privégebruik\s+auto/i.test(line)) {
          formatADetected = true;
          const nextLine = lookaheadLines[j + 1];
          const eurs = [...nextLine.matchAll(/€\s*([\d.,]+)/g)];
          if (eurs.length >= 2) {
            eigenBijdrageAuto = parseEurNL(eurs[0][1]);
            waardePrivegebruikAuto = parseEurNL(eurs[1][1]);
          } else if (eurs.length === 1) {
            eigenBijdrageAuto = parseEurNL(eurs[0][1]);
          }
          break;
        }
      }

      if (!formatADetected) {
        // Format B: separate label per line
        for (let j = 0; j < lookaheadLines.length; j++) {
          const line = lookaheadLines[j];
          if (/^Eigen\s+bijdrage\s+auto\s*$/i.test(line)) {
            for (let k = j + 1; k < lookaheadLines.length; k++) {
              const m = lookaheadLines[k].match(/^€\s*([\d.,]+)\s*$/);
              if (m) { eigenBijdrageAuto = parseEurNL(m[1]); break; }
            }
          } else if (/^Waarde\s+privégebruik\s+auto\s*$/i.test(line)) {
            for (let k = j + 1; k < lookaheadLines.length; k++) {
              const m = lookaheadLines[k].match(/^€\s*([\d.,]+)\s*$/);
              if (m) { waardePrivegebruikAuto = parseEurNL(m[1]); break; }
            }
          }
        }

        // SV-loon (Format B): standalone € line that is NOT after a label
        if (svLoon === 0) {
          for (let j = 0; j < lookaheadLines.length; j++) {
            const line = lookaheadLines[j];
            if (!/^€\s*[\d.,]+\s*$/.test(line)) continue;
            const value = parseEurNL(line.match(/€\s*([\d.,]+)/)[1]);
            const prevLine = j > 0 ? lookaheadLines[j - 1] : '';
            const isAfterEigen = /^Eigen\s+bijdrage\s+auto\s*$/i.test(prevLine);
            const isAfterWaarde = /^Waarde\s+privégebruik\s+auto\s*$/i.test(prevLine);
            if (!isAfterEigen && !isAfterWaarde && value > svLoon) {
              svLoon = value;
            }
          }
        }
      }

      // Avoid duplicates across page boundaries
      if (!werkgever.loonitems.some(li => li.periode === periode)) {
        werkgever.loonitems.push({
          periode, uren, svLoon, eigenBijdrageAuto, waardePrivegebruikAuto,
        });
      }
    }
  }

  return {
    aanvragerNaam,
    aanmaakdatum,
    vzbVersie,
    geboortedatum,
    geslacht,
    werkgevers: Array.from(werkgeverMap.values()),
  };
}

// ============================================================
// PIEK-AFTOPPING (vereenvoudigd)
// ============================================================
//
// Voor de chart en B/C berekening: Niet Bestendige Pieken worden afgetopt op
// basis van de meerjarige vergelijking. Implementatie is een vereenvoudiging
// van hoofdstuk 6 van de rekenregels.

// ============================================================
// VOORBEWERKING van contracten (Rekenregels 5.1, 5.5, 5.6)
// Wordt uitgevoerd VOORDAT de beslisboom doorlopen wordt
// ============================================================

// Detecteer betaaltermijn van een loonitem (per Appendix 7)
function detecteerBetaaltermijn(periode) {
  const m = periode.match(/(\d{1,2})-(\d{1,2})-(\d{4})\s*t\/m\s*(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (!m) return 'maandelijks';
  const start = new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
  const end = new Date(parseInt(m[6]), parseInt(m[5]) - 1, parseInt(m[4]));
  const days = Math.round((end - start) / (24 * 3600 * 1000)) + 1;
  // Maandelijks: start op de 1e en eindigt op laatste dag van die maand
  const isStartFirstDay = start.getDate() === 1;
  const lastDayOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const isEndLastDay = end.getDate() === lastDayOfMonth && end.getMonth() === start.getMonth();
  if (isStartFirstDay && isEndLastDay) return 'maandelijks';
  if (days === 28) return 'vierwekelijks';
  // Default per rekenregels: maandelijks
  return 'maandelijks';
}

// Bepaal de meest gangbare betaaltermijn van een contract (van het meest recente loonitem)
function contractBetaaltermijn(loonitems) {
  const sorted = sortLoonitems(loonitems);
  if (sorted.length === 0) return 'maandelijks';
  return detecteerBetaaltermijn(sorted[0].periode);
}

// 5.5 Samenvoegen van Contracten (binnen Dezelfde Werkgever)
// Gegeven: lijst werkgevers (kunnen meerdere contracten bij dezelfde werkgever zitten)
// Resultaat: gemergde lijst waar contracten bij dezelfde werkgever gecombineerd zijn
//   indien er voldaan wordt aan de criteria.
function samenvoegContracten(werkgevers) {
  // Groepeer werkgevers op (naam + loonheffingennummer): "Dezelfde Werkgever"
  const groepen = new Map();
  werkgevers.forEach(w => {
    const key = `${w.naam}::${w.loonheffingennummer}`;
    if (!groepen.has(key)) groepen.set(key, []);
    groepen.get(key).push(w);
  });

  const merged = [];
  for (const [key, contracten] of groepen.entries()) {
    if (contracten.length === 1) {
      merged.push(contracten[0]);
      continue;
    }
    // Multi-contract: probeer samen te voegen
    // Sorteer contracten op meest recente einddatum (descending)
    const sorted = [...contracten].sort((a, b) => {
      const aLast = sortLoonitems(a.loonitems)[0];
      const bLast = sortLoonitems(b.loonitems)[0];
      return parsePeriode(bLast.periode).end - parsePeriode(aLast.periode).end;
    });

    // Check criteria voor merging
    const meestRecent = sorted[0];
    const meestRecentLi = sortLoonitems(meestRecent.loonitems);
    const recentEinddatum = parsePeriode(meestRecentLi[0].periode).end;
    const recentBegindatum = parsePeriode(meestRecentLi[meestRecentLi.length - 1].periode).start;
    const meestRecentBetaaltermijn = contractBetaaltermijn(meestRecent.loonitems);

    // Probeer elk volgend contract aan te sluiten
    let huidig = { ...meestRecent, loonitems: [...meestRecent.loonitems] };
    let mergeMogelijk = true;
    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      const nextLi = sortLoonitems(next.loonitems);
      const nextEinddatum = parsePeriode(nextLi[0].periode).end;
      const huidigBegindatum = parsePeriode(sortLoonitems(huidig.loonitems)[sortLoonitems(huidig.loonitems).length - 1].periode).start;

      // Criterium 1: zelfde betaaltermijn
      if (contractBetaaltermijn(next.loonitems) !== meestRecentBetaaltermijn) {
        mergeMogelijk = false;
        break;
      }
      // Criterium 2: aansluitende datumreeksen (geen gaten/overlap)
      // einddatum van next moet 1 dag voor begindatum van huidig liggen
      const dagVerschil = Math.round((huidigBegindatum - nextEinddatum) / (24 * 3600 * 1000));
      if (dagVerschil !== 1) {
        mergeMogelijk = false;
        break;
      }
      // Voeg loonitems samen
      huidig.loonitems = [...huidig.loonitems, ...next.loonitems];
    }

    if (mergeMogelijk) {
      // Sorteer eindresultaat
      huidig.loonitems = sortLoonitems(huidig.loonitems);
      huidig._samengevoegd = sorted.length;
      merged.push(huidig);
    } else {
      // Voeg afzonderlijke contracten toe (beslisboom doorlopen per contract)
      contracten.forEach(c => merged.push(c));
    }
  }
  return merged;
}

// 5.1 Verlofregel: verwijder verlofperiodes (0 uren) uit Vaste Contracten
function pasVerlofregelToe(werkgever) {
  if (!werkgever.loonitems || werkgever.loonitems.length === 0) return werkgever;
  // Alleen voor Vaste Contracten (Niet-Vaste contracten of Uitkeringen niet)
  if (werkgever.isUitkering) return werkgever;
  // Check of contractvorm "vast" is (we kennen die check al)
  const isVast = isVastContractvorm(werkgever.contractvorm);
  if (!isVast) return werkgever;

  // Geen mengvorm betaaltermijnen toegestaan
  const betaaltermijnen = new Set(werkgever.loonitems.map(li => detecteerBetaaltermijn(li.periode)));
  if (betaaltermijnen.size > 1) return werkgever;

  const sorted = sortLoonitems(werkgever.loonitems);
  const N = sorted.length;
  if (N < 4) return werkgever; // niet genoeg historie

  // Vind blokken van 0-uren perioden (in het deel NA de meest recente 3 perioden)
  // sorted is descending; index 0,1,2 = meest recent (mag niet aangepast worden)
  let i = 3;
  let meestRecenteVerlofBlok = null;
  while (i < N) {
    if ((sorted[i].uren || 0) === 0) {
      const start = i;
      while (i < N && (sorted[i].uren || 0) === 0) i++;
      const end = i; // exclusive
      const lengte = end - start;
      // Criterium: max 6 perioden
      if (lengte > 6) { continue; }
      // Periode voor (= meer recent, dus index start-1) en periode na (= index end)
      if (start === 0 || end >= N) { continue; } // randgeval
      const urenVoor = sorted[start - 1].uren || 0;
      const urenNa = sorted[end].uren || 0;
      // Criterium: voor en na exact zelfde uren
      if (urenVoor !== urenNa || urenVoor === 0) { continue; }
      // Eerste valide blok = meest recente (we lopen van recent naar oud)
      meestRecenteVerlofBlok = { start, end, lengte };
      break;
    }
    i++;
  }

  if (!meestRecenteVerlofBlok) return werkgever;

  // Verwijder de verlofperiodes — overige perioden schuiven naar voren in de tijd
  // (in de praktijk: we verwijderen ze gewoon uit de lijst)
  const newLoonitems = [
    ...sorted.slice(0, meestRecenteVerlofBlok.start),
    ...sorted.slice(meestRecenteVerlofBlok.end),
  ];

  return {
    ...werkgever,
    loonitems: newLoonitems,
    _verlofregelToegepast: {
      lengte: meestRecenteVerlofBlok.lengte,
      origineelAantal: N,
      nieuwAantal: newLoonitems.length,
    },
  };
}

// 5.6.5.1 Omrekening Bronperiode → Doelperiodes (vierwekelijks ↔ maandelijks)
// Gegeven een Bronperiode-loonitem en bestaande Doelperiode-datumreeksen,
// kent het loonitem proportioneel toe op basis van overlapping dagen.
function omrekenenLoonitem(bronLi, doelDatumreeksen) {
  const bronP = parsePeriode(bronLi.periode);
  if (!bronP) return [];
  const totaalDagen = Math.round((bronP.end - bronP.start) / (24 * 3600 * 1000)) + 1;
  const result = [];
  for (const doelStr of doelDatumreeksen) {
    const doelP = parsePeriode(doelStr);
    if (!doelP) continue;
    const overlapStart = new Date(Math.max(bronP.start, doelP.start));
    const overlapEnd = new Date(Math.min(bronP.end, doelP.end));
    if (overlapEnd < overlapStart) continue;
    const overlapDagen = Math.round((overlapEnd - overlapStart) / (24 * 3600 * 1000)) + 1;
    if (overlapDagen <= 0) continue;
    const aandeel = overlapDagen / totaalDagen;
    result.push({
      doelPeriode: doelStr,
      aandeel,
      svLoon: (bronLi.svLoon || 0) * aandeel,
      uren: (bronLi.uren || 0) * aandeel,
      waardePrivegebruikAuto: (bronLi.waardePrivegebruikAuto || 0) * aandeel,
      eigenBijdrageAuto: (bronLi.eigenBijdrageAuto || 0) * aandeel,
    });
  }
  return result;
}

// Genereer de doel-datumreeksen bij omrekening
function genereerDoelDatumreeksen(naar, fromDate, toDate) {
  // naar = 'maandelijks' of 'vierwekelijks'
  const reeksen = [];
  if (naar === 'maandelijks') {
    let cursor = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
    while (cursor <= toDate) {
      const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      const fmt = (d) => `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
      reeksen.push(`${fmt(start)} t/m ${fmt(end)}`);
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
  } else {
    // Voor vierwekelijks gebruiken we de KOPPELTABEL (eerste mapping)
    // Dit is een vereenvoudiging; bij echte gebruik moet de officiële tabel uit Bijlage Appendix 7 worden gebruikt
    const sortedKeys = Object.keys(KOPPELTABEL_MAAND_NAAR_4WK).sort();
    for (const key of sortedKeys) {
      const v = KOPPELTABEL_MAAND_NAAR_4WK[key];
      const p = parsePeriode(v);
      if (p && p.end >= fromDate && p.start <= toDate) {
        reeksen.push(v);
      }
    }
  }
  return reeksen;
}

// Heel een contract omrekenen naar één betaaltermijn
function rekenContractOm(werkgever, doelBetaaltermijn) {
  if (!werkgever.loonitems || werkgever.loonitems.length === 0) return werkgever;
  // Check of er een mengvorm aanwezig is (anders is omrekening niet nodig)
  const huidigeBetaaltermijnen = werkgever.loonitems.map(li => detecteerBetaaltermijn(li.periode));
  const heeftMengvorm = new Set(huidigeBetaaltermijnen).size > 1;
  if (!heeftMengvorm) return werkgever;

  // Bepaal omvang van het volledige contract
  const sorted = sortLoonitems(werkgever.loonitems);
  const allesEinddatum = parsePeriode(sorted[0].periode).end;
  const allesBegindatum = parsePeriode(sorted[sorted.length - 1].periode).start;

  // Genereer de doel-datumreeksen
  const doelReeksen = genereerDoelDatumreeksen(doelBetaaltermijn, allesBegindatum, allesEinddatum);
  if (doelReeksen.length === 0) return werkgever;

  // Voor elk loonitem: als betaaltermijn al klopt, behoud; anders verdeel over doel
  const aggregaat = new Map(); // doelPeriode → aggregated values
  doelReeksen.forEach(d => aggregaat.set(d, { periode: d, svLoon: 0, uren: 0, waardePrivegebruikAuto: 0, eigenBijdrageAuto: 0 }));

  for (const li of werkgever.loonitems) {
    const bt = detecteerBetaaltermijn(li.periode);
    if (bt === doelBetaaltermijn) {
      // Behoud zoals het is — pas in aggregaat toe (voeg toe voor exacte match)
      const a = aggregaat.get(li.periode);
      if (a) {
        a.svLoon += li.svLoon || 0;
        a.uren += li.uren || 0;
        a.waardePrivegebruikAuto += li.waardePrivegebruikAuto || 0;
        a.eigenBijdrageAuto += li.eigenBijdrageAuto || 0;
      }
      continue;
    }
    // Verdeel proportioneel
    const verdeling = omrekenenLoonitem(li, doelReeksen);
    for (const v of verdeling) {
      const a = aggregaat.get(v.doelPeriode);
      if (a) {
        a.svLoon += v.svLoon;
        a.uren += v.uren;
        a.waardePrivegebruikAuto += v.waardePrivegebruikAuto;
        a.eigenBijdrageAuto += v.eigenBijdrageAuto;
      }
    }
  }

  // Filter perioden zonder data
  const newLoonitems = [...aggregaat.values()].filter(p => p.svLoon > 0 || p.uren > 0);
  return {
    ...werkgever,
    loonitems: newLoonitems,
    _omgerekendNaar: doelBetaaltermijn,
  };
}

// ============================================================

// === 6.2 Vaststellen (Niet-)Incidentele Pieken ===
// Voor elke periode in laatste jaar (12), vergelijk met dezelfde periode jaar 1 en 2 eerder.
// Markeer alle perioden in de vergelijking met hetzelfde type.
function bepaalIncidenteelType(sorted) {
  const types = new Map();
  for (let i = 0; i < Math.min(12, sorted.length); i++) {
    const huidig = sorted[i].svLoon;
    const j1 = i + 12 < sorted.length ? sorted[i + 12].svLoon : null;
    const j2 = i + 24 < sorted.length ? sorted[i + 24].svLoon : null;
    const values = [huidig, j1, j2].filter(v => v !== null);
    const adjusted = values.map(v => v <= 0 ? 0.01 : v);
    const min = Math.min(...adjusted);
    const max = Math.max(...adjusted);
    const isIncidenteel = (max / min) > 1.30;
    const t = isIncidenteel ? 'incidenteel' : 'niet-incidenteel';
    types.set(i, t);
    if (i + 12 < sorted.length) types.set(i + 12, t);
    if (i + 24 < sorted.length) types.set(i + 24, t);
  }
  return types;
}

// === 6.3 Gemiddeld Periode Inkomen ===
function gemiddeldPeriodeInkomen(sorted, scopeMonths, piekTypes) {
  let sum = 0, count = 0;
  for (let i = 0; i < Math.min(scopeMonths, sorted.length); i++) {
    const huidig = sorted[i].svLoon;
    if (huidig <= 0) continue;
    let vorige = 0;
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].svLoon > 0) { vorige = sorted[j].svLoon; break; }
    }
    const ratio = vorige > 0 ? huidig / vorige : 0;
    const isIncidenteel = piekTypes.get(i) === 'incidenteel';
    if (ratio > 1.5 && isIncidenteel) continue;
    sum += huidig;
    count++;
  }
  return count > 0 ? sum / count : 0;
}

// === 6.4 Aftopping Excessieve Incidentele Pieken ===
function aftopExcessieveIncidentelePieken(sorted, scopeMonths, piekTypes, GPI) {
  const mitigated = sorted.map(li => ({
    ...li, mitigatedSvLoon: li.svLoon, eipPiek: false, enipPiek: false,
  }));
  for (let i = 0; i < Math.min(scopeMonths, sorted.length); i++) {
    const huidig = sorted[i].svLoon;
    if (huidig <= 0) continue;
    const isIncidenteel = piekTypes.get(i) === 'incidenteel';
    const isExcessief = huidig > 1.5 * GPI;
    if (!isIncidenteel || !isExcessief) continue;
    mitigated[i].eipPiek = true;
    const monthIdx = i % 12;
    const refIndices = [monthIdx, monthIdx + 12, monthIdx + 24];
    const refValues = refIndices
      .map(idx => idx < sorted.length ? sorted[idx].svLoon : null)
      .filter(v => v !== null && v >= 0);
    const gemRefs = refValues.length > 0 ? refValues.reduce((s, v) => s + v, 0) / refValues.length : 0;
    let meestRecente = 0;
    for (const idx of refIndices) {
      if (idx < sorted.length && sorted[idx].svLoon > 0) {
        meestRecente = sorted[idx].svLoon;
        break;
      }
    }
    const eipA = 2 * GPI;
    const eipB = Math.min(gemRefs, meestRecente);
    const cap = Math.min(huidig, eipA, eipB);
    mitigated[i].mitigatedSvLoon = cap;
  }
  return mitigated;
}

// === 6.5 Gemiddeld Jaar Inkomen ===
function gemiddeldJaarInkomen(mitigated, periodsToCheck) {
  let sum = 0, count = 0;
  for (let i = 0; i < Math.min(periodsToCheck, mitigated.length); i++) {
    const huidig = mitigated[i].mitigatedSvLoon;
    if (huidig <= 0) continue;
    let vorige = 0;
    for (let j = i + 1; j < mitigated.length; j++) {
      if (mitigated[j].mitigatedSvLoon > 0) { vorige = mitigated[j].mitigatedSvLoon; break; }
    }
    const ratio = vorige > 0 ? huidig / vorige : 1;
    if (ratio <= 1.3) {
      sum += huidig;
      count++;
    }
  }
  if (count === 0) return 0;
  return (sum / count) * 12;
}

// === 6.6 Aftopping Excessieve Niet-Incidentele Pieken ===
function aftopExcessieveNietIncidentelePieken(mitigated, scopeMonths, piekTypes, GJI) {
  const threshold = (4 / 12) * GJI;
  for (let i = 0; i < Math.min(scopeMonths, mitigated.length); i++) {
    const huidig = mitigated[i].mitigatedSvLoon;
    const isNietIncidenteel = piekTypes.get(i) === 'niet-incidenteel';
    if (!isNietIncidenteel || huidig <= threshold) continue;
    const monthIdx = i % 12;
    const refIndices = [monthIdx, monthIdx + 12, monthIdx + 24];
    const refValues = refIndices
      .map(idx => idx < mitigated.length ? mitigated[idx].mitigatedSvLoon : null)
      .filter(v => v !== null && v >= 0);
    const gemRefs = refValues.length > 0 ? refValues.reduce((s, v) => s + v, 0) / refValues.length : 0;
    let meestRecente = 0;
    for (const idx of refIndices) {
      if (idx < mitigated.length && mitigated[idx].mitigatedSvLoon > 0) {
        meestRecente = mitigated[idx].mitigatedSvLoon;
        break;
      }
    }
    const aftopA = (4 / 12) * GJI;
    const aftopB = Math.min(gemRefs, meestRecente);
    const cap = Math.min(huidig, aftopA, aftopB);
    if (cap < huidig) {
      mitigated[i].mitigatedSvLoon = cap;
      mitigated[i].enipPiek = true;
    }
  }
  return mitigated;
}

// === 3.7 Bestendigheidstoets ===
function bestendigheidstoets(loonitems) {
  const sorted = sortLoonitems(loonitems);
  if (sorted.length < 24) {
    return { bestendig: false, criterium1: false, criterium2: false, inkomensstijging: 0, nietBestendigePieken: [], reason: 'Te weinig perioden' };
  }
  // Criterium 1: inkomensstijging max 20% (signed Z, niet geclamped)
  const r12 = sorted.slice(0, 12);
  const p12 = sorted.slice(12, 24);
  const ijr1 = r12.reduce((s, li) => s + (li.svLoon || 0) - (li.waardePrivegebruikAuto || 0) + (li.eigenBijdrageAuto || 0), 0);
  const ijr2 = p12.reduce((s, li) => s + (li.svLoon || 0) - (li.waardePrivegebruikAuto || 0) + (li.eigenBijdrageAuto || 0), 0);
  const inkomensstijging = ijr2 > 0 ? (ijr1 / ijr2) * 100 : (ijr1 > 0 ? 999 : 0);
  const criterium1 = inkomensstijging <= 120;

  const nietBestendigePieken = [];
  if (criterium1) {
    // Criterium 2: voor elke periode in laatste 12 maanden, check niet-bestendige piek (3.7.2)
    for (let t = 0; t < 12; t++) {
      if (t + 1 >= sorted.length) break;
      const huidig = sorted[t].svLoon || 0;
      const vorige = sorted[t + 1].svLoon || 0.01;
      const V1 = huidig / Math.max(vorige, 0.01);
      if (V1 <= 1.3) continue;

      // Step 2: V2 (zelfde periode jaar eerder)
      if (t + 13 >= sorted.length) continue;
      const jaarEerder = sorted[t + 12].svLoon || 0;
      const jaarEerderVorige = sorted[t + 13].svLoon || 0.01;
      const V2 = jaarEerder / Math.max(jaarEerderVorige, 0.01);
      if (V2 <= 1.3) {
        nietBestendigePieken.push({ index: t, periode: sorted[t].periode, V1, V2, reason: 'V2≤1.3' });
        continue;
      }

      // Step 3: max/min ratio
      const ratio = Math.max(huidig, jaarEerder) / Math.max(Math.min(huidig, jaarEerder), 0.01);
      if (ratio > 1.3) {
        nietBestendigePieken.push({ index: t, periode: sorted[t].periode, V1, V2, ratio, reason: 'max/min>1.3' });
        continue;
      }

      // Step 4: dubbele piek (alleen als niet meest recente)
      if (t === 0) continue;
      const tPlus1 = sorted[t - 1].svLoon || 0;
      if (tPlus1 / Math.max(vorige, 0.01) <= 1.3) continue;
      if (t + 11 >= sorted.length) continue;
      const tPlus1JaarEerder = sorted[t - 1 + 12].svLoon || 0;
      const dubbelRatio = Math.max(tPlus1, tPlus1JaarEerder) / Math.max(Math.min(tPlus1, tPlus1JaarEerder), 0.01);
      if (dubbelRatio > 1.3) {
        nietBestendigePieken.push({ index: t, periode: sorted[t].periode, V1, V2, reason: 'dubbele piek' });
      }
    }
  }

  const criterium2 = nietBestendigePieken.length === 0;
  const piekDetail = nietBestendigePieken.length > 0
    ? `Niet-bestendige piek in ${nietBestendigePieken[0].periode} (${nietBestendigePieken[0].reason})`
    : '';
  return {
    bestendig: criterium1 && criterium2,
    inkomensstijging,
    criterium1,
    criterium2,
    nietBestendigePieken,
    piekDetail,
  };
}

// === 3.2 Urenpercentage + 5.2 Parttimepercentage ===
function urenpercentage(allLoonitems) {
  const sorted = sortLoonitems(allLoonitems);
  const recent3 = sorted.slice(0, 3);
  const recent12 = sorted.slice(0, 12);
  const sumUren = items => items.reduce((s, li) => s + (li.uren || 0), 0);

  if (recent3.length < 3) return { ok: false, percentage: 0, U3: 0, Ujr: 0, error: 'Het verzekeringsbericht bevat geen loonitems in de eerste 3 perioden.' };
  // 3.2.3 sub 1: geen 0 uren in laatste 3
  if (recent3.some(li => (li.uren || 0) === 0)) {
    return { ok: false, percentage: 0, U3: 0, Ujr: 0, error: 'In één of meer van de 3 meest recente perioden is 0 gewerkte uren geconstateerd.' };
  }
  // 3.2.3 sub 3: geen negatieve uren in eerste 4 perioden
  if (sorted.slice(0, 4).some(li => (li.uren || 0) < 0)) {
    return { ok: false, percentage: 0, U3: 0, Ujr: 0, error: 'Geen berekening mogelijk. Indien er sprake is van een negatief aantal uren in de afgelopen 4 maanden of 5 vierwekelijkse perioden kan er geen correcte berekening van het uren- en of parttimepercentage worden vastgesteld.' };
  }

  const U3 = sumUren(recent3) / 3;
  const Ujr = sumUren(recent12) / Math.min(recent12.length, 12);
  const pct = Ujr > 0 ? (U3 / Ujr) * 100 : 100;

  // 5.2 Parttimepercentage (alleen toepassen als pct < 93,7%)
  let parttimePercentage = 100;
  if (pct < 93.7) {
    // UPT3: laagste van de 3 recentste perioden
    const upt3 = Math.min(...recent3.map(li => li.uren || 0));
    // UPTjr: gemiddelde uren over periodes 4-15
    const periode4tot15 = sorted.slice(3, 15);
    const uptjr = periode4tot15.length > 0
      ? sumUren(periode4tot15) / Math.min(periode4tot15.length, 12)
      : 0;
    parttimePercentage = uptjr > 0 ? Math.min(100, Math.max(0, (upt3 / uptjr) * 100)) : 100;
  }

  return { ok: true, percentage: pct, U3, Ujr, parttimePercentage, voldoende: pct >= 93.7 };
}

// === 3.2.3 Attendering bij teveel gewerkte uren ===
// Officiële drempels per API spec p.31:
//   Maandelijks: > 208 uur per periode
//   Vierwekelijks: > 192 uur per periode
function attenderingTeveelUren(loonitems) {
  const sorted = sortLoonitems(loonitems);
  if (sorted.length < 1) return { teveel: false, perioden: [] };
  // Detecteer betaaltermijn van het meest recente loonitem
  const bt = detecteerBetaaltermijn(sorted[0].periode);
  const drempel = bt === 'vierwekelijks' ? 192 : 208;
  const perioden = sorted.slice(0, Math.min(12, sorted.length))
    .filter(li => (li.uren || 0) > drempel);
  const tekst = bt === 'vierwekelijks'
    ? 'Let op: de aanvrager heeft afgelopen jaar in minimaal één periode meer dan 192 uur gewerkt.'
    : 'Let op: de aanvrager heeft afgelopen jaar in minimaal één periode meer dan 208 uur gewerkt.';
  return {
    teveel: perioden.length > 0,
    perioden,
    drempel,
    betaaltermijn: bt,
    tekst: perioden.length > 0 ? tekst : null,
  };
}

// === 4.1 A-Berekening ===
function berekenA(loonitems, parttimePercentage) {
  const sorted = sortLoonitems(loonitems);
  const PT = parttimePercentage / 100;

  // Bij A-berekening: alleen Excessieve Niet-Incidentele Pieken aftoppen.
  // (Excessieve Incidentele Pieken aftopping is alleen voor B/C)
  const piekTypes = bepaalIncidenteelType(sorted);
  // Voor A is de scope 12 maanden, maar piek-type bepaling vergt 36 maanden lookup.

  // Skip stap 6.4 (excessieve incidentele aftopping) voor A
  let mitigated = sorted.map(li => ({ ...li, mitigatedSvLoon: li.svLoon, eipPiek: false, enipPiek: false }));

  // Voor 6.6: GJI nodig
  const gji36 = gemiddeldJaarInkomen(mitigated, 36);
  const gji12 = gemiddeldJaarInkomen(mitigated, 12);
  const GJI = Math.min(gji36, gji12);

  mitigated = aftopExcessieveNietIncidentelePieken(mitigated, 12, piekTypes, GJI);

  const I3 = mitigated.slice(0, 3).reduce((s, p) => s + p.mitigatedSvLoon, 0);
  const I9 = mitigated.slice(3, 12).reduce((s, p) => s + p.mitigatedSvLoon, 0);
  const I = I3 + I9 * PT;

  // Z over 12 perioden, geclamped op 0 indien negatief
  const Zraw = mitigated.slice(0, 12).reduce((s, p) =>
    s + (p.waardePrivegebruikAuto || 0) - (p.eigenBijdrageAuto || 0), 0);
  const Z = Math.max(0, Zraw);

  return {
    type: 'A',
    toetsinkomen: I - Z,
    I, I3, I9, Z, GJI, PT: parttimePercentage,
    mitigated: mitigated.slice(0, 12),
    detail: `I3 = ${fmtEur(I3)} + I9 × PT% = ${fmtEur(I9)} × ${parttimePercentage.toFixed(2)}% → I = ${fmtEur(I)}, Z = ${fmtEur(Z)}`,
  };
}

// === 4.2 B-Berekening ===
function berekenB(loonitems, parttimePercentage) {
  const sorted = sortLoonitems(loonitems);
  const PT = parttimePercentage / 100;

  // 6.2: bepaal incidenteel/niet-incidenteel
  const piekTypes = bepaalIncidenteelType(sorted);

  // 6.3: Gemiddeld Periode Inkomen (over 24 maanden)
  const GPI = gemiddeldPeriodeInkomen(sorted, 24, piekTypes);

  // 6.4: aftop excessieve incidentele pieken
  let mitigated = aftopExcessieveIncidentelePieken(sorted, 24, piekTypes, GPI);

  // 6.5: Gemiddeld Jaar Inkomen
  const gji36 = gemiddeldJaarInkomen(mitigated, 36);
  const gji12 = gemiddeldJaarInkomen(mitigated, 12);
  const GJI = Math.min(gji36, gji12);

  // 6.6: aftop excessieve niet-incidentele pieken
  mitigated = aftopExcessieveNietIncidentelePieken(mitigated, 24, piekTypes, GJI);

  // 4.2 Specificatie:
  const I3 = mitigated.slice(0, 3).reduce((s, p) => s + p.mitigatedSvLoon, 0);
  const I9 = mitigated.slice(3, 12).reduce((s, p) => s + p.mitigatedSvLoon, 0);
  const I21 = mitigated.slice(3, 24).reduce((s, p) => s + p.mitigatedSvLoon, 0);

  const I2jr = (I3 + I21 * PT) / 2;
  const Ijr = I3 + I9 * PT;

  // Z2jr en Zjr: clamped op 0 indien negatief
  const Z2jrRaw = mitigated.slice(0, 24).reduce((s, p) =>
    s + (p.waardePrivegebruikAuto || 0) - (p.eigenBijdrageAuto || 0), 0);
  const Z2jr = Math.max(0, Z2jrRaw) / 2;
  const ZjrRaw = mitigated.slice(0, 12).reduce((s, p) =>
    s + (p.waardePrivegebruikAuto || 0) - (p.eigenBijdrageAuto || 0), 0);
  const Zjr = Math.max(0, ZjrRaw);

  const optie1 = I2jr - Z2jr;
  const optie2 = Ijr - Zjr;
  const toetsinkomen = Math.min(optie1, optie2);

  return {
    type: 'B',
    toetsinkomen,
    GPI, GJI, gji36, gji12,
    I3, I9, I21, I2jr, Ijr, Z2jr, Zjr, optie1, optie2,
    PT: parttimePercentage,
    mitigated: mitigated.slice(0, 24),
    piekTypes,
    detail: `Min van: gemiddelde 2-jaar (I2jr - Z2jr) = ${fmtEur(optie1)} en laatste jaar (Ijr - Zjr) = ${fmtEur(optie2)}`,
  };
}

// === 4.3 C-Berekening ===
function berekenC(reguliereLoonitems, uitkeringLoonitems, parttimePercentage) {
  // Aggregeer per kalendermaand: regulier + uitkering
  const periodMap = new Map();
  const addToMap = (li, isUitkering) => {
    const p = parsePeriode(li.periode);
    if (!p) return;
    const key = `${p.start.getFullYear()}-${String(p.start.getMonth() + 1).padStart(2, '0')}`;
    if (!periodMap.has(key)) {
      periodMap.set(key, {
        periode: li.periode, parsedPeriode: p,
        svLoonRegulier: 0, svLoonUitkering: 0,
        waardePrivegebruikAuto: 0, eigenBijdrageAuto: 0, uren: 0,
      });
    }
    const e = periodMap.get(key);
    if (isUitkering) e.svLoonUitkering += (li.svLoon || 0);
    else e.svLoonRegulier += (li.svLoon || 0);
    e.waardePrivegebruikAuto += (li.waardePrivegebruikAuto || 0);
    e.eigenBijdrageAuto += (li.eigenBijdrageAuto || 0);
    e.uren += (li.uren || 0);
  };
  reguliereLoonitems.forEach(li => addToMap(li, false));
  uitkeringLoonitems.forEach(li => addToMap(li, true));

  let periodes = Array.from(periodMap.values())
    .sort((a, b) => b.parsedPeriode.end - a.parsedPeriode.end)
    .map(p => ({ ...p, svLoon: p.svLoonRegulier + p.svLoonUitkering }));

  // Bereken uitkeringspercentage per periode
  periodes = periodes.map(p => ({
    ...p,
    uitkeringspercentage: p.svLoon > 0 ? p.svLoonUitkering / p.svLoon : 0,
  }));

  const PT = parttimePercentage / 100;

  // 6.2 - 6.6 op het Periodeinkomen (incl. uitkeringen)
  const piekTypes = bepaalIncidenteelType(periodes);
  const GPI = gemiddeldPeriodeInkomen(periodes, 36, piekTypes);
  let mitigated = aftopExcessieveIncidentelePieken(periodes, 36, piekTypes, GPI);
  const gji36 = gemiddeldJaarInkomen(mitigated, 36);
  const gji12 = gemiddeldJaarInkomen(mitigated, 12);
  const GJI = Math.min(gji36, gji12);
  mitigated = aftopExcessieveNietIncidentelePieken(mitigated, 36, piekTypes, GJI);

  // I3i (incl uitk), I33i (mnd 4-36 incl uitk)
  const I3i = mitigated.slice(0, 3).reduce((s, p) => s + p.mitigatedSvLoon, 0);
  const I33i = mitigated.slice(3, 36).reduce((s, p) => s + p.mitigatedSvLoon, 0);
  const I3jr = (I3i + I33i * PT) / 3;

  // Voor exclusief uitkeringen: corrigeer mitigated × (1 - uitkeringspct)
  const exclMitigated = (idx) => {
    const p = mitigated[idx];
    const m = p.mitigatedSvLoon;
    const pct = p.uitkeringspercentage || 0;
    return m * (1 - pct);
  };
  const I3e = mitigated.slice(0, 3).reduce((s, _, i) => s + exclMitigated(i), 0);
  const I9e = mitigated.slice(3, 12).reduce((s, _, i) => s + exclMitigated(i + 3), 0);
  const Ijr = I3e + I9e * PT;

  // Z3jr en Zjr: clamped op 0
  const Z3jrRaw = mitigated.slice(0, 36).reduce((s, p) =>
    s + (p.waardePrivegebruikAuto || 0) - (p.eigenBijdrageAuto || 0), 0);
  const Z3jr = Math.max(0, Z3jrRaw) / 3;
  const ZjrRaw = mitigated.slice(0, 12).reduce((s, p) =>
    s + (p.waardePrivegebruikAuto || 0) - (p.eigenBijdrageAuto || 0), 0);
  const Zjr = Math.max(0, ZjrRaw);

  const optie1 = I3jr - Z3jr;
  const optie2 = Ijr - Zjr;
  const toetsinkomen = Math.min(optie1, optie2);

  return {
    type: 'C',
    toetsinkomen,
    GPI, GJI, gji36, gji12,
    I3i, I33i, I3jr, I3e, I9e, Ijr, Z3jr, Zjr, optie1, optie2,
    PT: parttimePercentage,
    mitigated: mitigated.slice(0, 36),
    piekTypes,
    detail: `Min van: gemiddelde 3-jaar incl. uitk. = ${fmtEur(optie1)} en laatste jaar excl. uitk. = ${fmtEur(optie2)}`,
  };
}

// === 4.4 D-Berekening ===
function berekenD(loonitems) {
  const sorted = sortLoonitems(loonitems);
  const recent4 = sorted.slice(0, 4);
  if (recent4.length < 4) {
    return { type: 'D', toetsinkomen: 0, detail: 'Onvoldoende perioden' };
  }
  const laagste = Math.min(...recent4.map(li => li.svLoon || 0));
  const I = laagste * 12;
  const meestRecent = sorted[0];
  // Z = netto bijtelling van meest recente periode × 12, clamped op 0
  const nettoBijtellingRaw = (meestRecent.waardePrivegebruikAuto || 0) - (meestRecent.eigenBijdrageAuto || 0);
  const Z = Math.max(0, nettoBijtellingRaw) * 12;

  return {
    type: 'D',
    toetsinkomen: I - Z,
    I, Z, laagste,
    mitigated: recent4.map(li => ({ ...li, mitigatedSvLoon: li.svLoon })),
    detail: `Laagste SV-loon van laatste 4 perioden = ${fmtEur(laagste)} × 12 = ${fmtEur(I)} -/- auto Z = ${fmtEur(Z)}`,
  };
}

// ============================================================
// HOOFD-DECISION TREE
// ============================================================
function berekenToetsinkomen({ werkgevers, eigenBijdrage, peildatum, aanvragerNaam }) {
  const result = {
    success: false,
    error: null,
    errorCode: null,
    steps: [],
    werkgeverResults: [],
    eigenBijdrage: eigenBijdrage || 0,
    sumIncome: 0,
    finalToetsinkomen: 0,
    omschrijving: '',
    samenstelling: '',
    isParttime: false,
    parttimePercentage: 100,
    urenpercentage: 100,
    voorbewerking: { samenvoegingen: [], verlofregelToegepast: [], omrekeningen: [] },
    sanityChecks: [],
  };

  // === SANITY CHECKS conform Appendix 6 + API foutcodes ===

  // Check 2035: Downloaddatum mag niet in toekomst liggen
  if (peildatum && peildatum > new Date()) {
    result.error = API_FOUTCODES[2035];
    result.errorCode = 2035;
    return result;
  }

  // Check 2034: ongeldige uren waarden (NaN, oneindig)
  for (const w of werkgevers) {
    for (const li of (w.loonitems || [])) {
      if (typeof li.uren !== 'number' || isNaN(li.uren) || !isFinite(li.uren)) {
        result.error = API_FOUTCODES[2034];
        result.errorCode = 2034;
        return result;
      }
    }
  }

  // Check 2030: negatieve uren in laatste 4 mnd (mnd) of 5 vw-perioden
  // Per Rekenregels 3.2.3: indien negatieve uren in deze recente perioden → geen berekening mogelijk
  if (peildatum) {
    for (const w of werkgevers) {
      if (!w.loonitems || w.loonitems.length === 0) continue;
      const sorted = sortLoonitems(w.loonitems);
      const bt = detecteerBetaaltermijn(sorted[0]?.periode || '');
      const checkPerioden = bt === 'vierwekelijks' ? 5 : 4;
      const recentSlice = sorted.slice(0, checkPerioden);
      const negatief = recentSlice.find(li => (li.uren || 0) < 0);
      if (negatief) {
        result.error = API_FOUTCODES[2030];
        result.errorCode = 2030;
        return result;
      }
    }
  }

  // Check 2036: loonitem mag max 3 perioden in toekomst liggen
  if (peildatum) {
    const max = new Date(peildatum);
    max.setMonth(max.getMonth() + 3);
    for (const w of werkgevers) {
      for (const li of (w.loonitems || [])) {
        const p = parsePeriode(li.periode);
        if (p && p.start > max) {
          result.error = API_FOUTCODES[2036];
          result.errorCode = 2036;
          return result;
        }
      }
    }
  }

  // Check 2037: UWV-loonheffingennummers mogen alleen voor UWV-uitkering omschrijvingen gebruikt worden
  for (const w of werkgevers) {
    const isUwvNr = UWV_LOONHEFFINGENNUMMERS.includes(w.loonheffingennummer);
    const isUwvOmschrijving = UWV_UITKERING_OMSCHRIJVINGEN.some(om =>
      (w.naam || '').includes(om) || om.includes(w.naam || '')
    );
    // Reguliere werkgever met UWV-loonheffingennummer → fout
    if (isUwvNr && !isUwvOmschrijving && !/UWV/i.test(w.naam || '')) {
      result.error = API_FOUTCODES[2037];
      result.errorCode = 2037;
      result.sanityChecks.push({ code: 2037, werkgever: w.naam });
      return result;
    }
  }

  // Filter alleen werkgevers met loonitems
  let validWerkgevers = werkgevers.filter(w => w.loonitems && w.loonitems.length > 0);
  if (validWerkgevers.length === 0) {
    result.error = API_FOUTCODES[2038];
    result.errorCode = 2038;
    return result;
  }

  // Check: contractvorm leeg (per Rekenregels Appendix 6 — negeer contracten zonder contractvorm)
  // Tenzij Uitkering, want Uitkeringen kennen geen contractvorm
  validWerkgevers = validWerkgevers.filter(w => {
    if (w.isUitkering) return true;
    // Vanaf 1-1-2020: contractvorm verplicht voor reguliere contracten
    if (!w.contractvorm || w.contractvorm.trim().length === 0) {
      result.sanityChecks.push({
        code: 'NEGEERD',
        werkgever: w.naam,
        reden: 'Contract zonder contractvorm wordt genegeerd (Rekenregels Appendix 6)',
      });
      return false;
    }
    return true;
  });

  if (validWerkgevers.length === 0) {
    result.error = API_FOUTCODES[2038];
    result.errorCode = 2038;
    return result;
  }

  // === VOORBEWERKING (Rekenregels 5.1, 5.5, 5.6) ===
  // Stap 1: Samenvoegen Contracten (5.5) — bij Dezelfde Werkgever met aansluitende perioden
  const voorSamenvoegen = validWerkgevers.length;
  validWerkgevers = samenvoegContracten(validWerkgevers);
  if (validWerkgevers.length < voorSamenvoegen) {
    result.voorbewerking.samenvoegingen.push({
      voorAantal: voorSamenvoegen,
      naAantal: validWerkgevers.length,
      detail: `${voorSamenvoegen - validWerkgevers.length} contract(en) samengevoegd bij dezelfde werkgever`,
    });
  }

  // Stap 2: Verlofregel (5.1) — alleen op Vaste Contracten
  validWerkgevers = validWerkgevers.map(w => {
    const orig = w;
    const result_w = pasVerlofregelToe(w);
    if (result_w._verlofregelToegepast) {
      result.voorbewerking.verlofregelToegepast.push({
        werkgever: w.naam,
        ...result_w._verlofregelToegepast,
      });
    }
    return result_w;
  });

  // Stap 3: Omrekening betaaltermijn (5.6.5) — bij wisseling binnen contract
  validWerkgevers = validWerkgevers.map(w => {
    const sortedLi = sortLoonitems(w.loonitems);
    if (sortedLi.length === 0) return w;
    const meestRecenteBt = detecteerBetaaltermijn(sortedLi[0].periode);
    const heeftMengvorm = new Set(w.loonitems.map(li => detecteerBetaaltermijn(li.periode))).size > 1;
    if (!heeftMengvorm) return w;
    const omgerekend = rekenContractOm(w, meestRecenteBt);
    if (omgerekend._omgerekendNaar) {
      result.voorbewerking.omrekeningen.push({
        werkgever: w.naam,
        naar: meestRecenteBt,
      });
    }
    return omgerekend;
  });

  // === Verzamel alle loonitems ===
  const allLoonitems = validWerkgevers.flatMap((w, wIdx) =>
    w.loonitems.map(li => ({ ...li, _werkgeverIdx: wIdx, parsedPeriode: parsePeriode(li.periode) }))
  ).filter(li => li.parsedPeriode);

  if (allLoonitems.length === 0) {
    result.error = 'Geen geldige periodes gevonden';
    return result;
  }

  allLoonitems.sort((a, b) => b.parsedPeriode.end - a.parsedPeriode.end);
  const algemeenMeestRecent = allLoonitems[0];
  const peildatumDate = peildatum ? new Date(peildatum) : new Date();

  // === STAP 1 ===
  const monthsAgo = monthsBetween(peildatumDate, algemeenMeestRecent.parsedPeriode.end);
  const stap1Ja = monthsAgo < 2 && (algemeenMeestRecent.uren || 0) > 0
    && !validWerkgevers[algemeenMeestRecent._werkgeverIdx].isUitkering;

  result.steps.push({
    nummer: 1,
    vraag: 'Werkt de aanvrager momenteel in loondienst? (Rekenregels 3.1)',
    antwoord: stap1Ja ? 'Ja' : 'Nee',
    detail: `Algemeen meest recent loonitem: ${algemeenMeestRecent.periode} (${monthsAgo} periode(s) geleden vanaf peildatum)`,
  });

  if (!stap1Ja) {
    result.error = 'De aanvrager komt niet in aanmerking voor IBL: meest recente loonitem te oud, geen uren of betreft uitkering.';
    return result;
  }

  // === STAP 2: Urenpercentage ===
  const reguliereLoonitems = allLoonitems.filter(li => !validWerkgevers[li._werkgeverIdx].isUitkering);
  const ur = urenpercentage(reguliereLoonitems);

  if (!ur.ok) {
    result.error = ur.error;
    return result;
  }

  result.urenpercentage = ur.percentage;
  result.parttimePercentage = ur.parttimePercentage || 100;
  result.isParttime = !ur.voldoende;

  result.steps.push({
    nummer: 2,
    vraag: 'Heeft de aanvrager de afgelopen 3 maanden voldoende gewerkt? (Rekenregels 3.2)',
    antwoord: ur.voldoende ? 'Ja' : 'Nee',
    detail: `Urenpercentage = (U3 / Ujr) × 100% = (${ur.U3.toFixed(2)} / ${ur.Ujr.toFixed(2)}) × 100% = ${ur.percentage.toFixed(2)}% (grens 93,7%)${!ur.voldoende ? ` → Parttimepercentage ${result.parttimePercentage.toFixed(2)}%` : ''}`,
  });

  // Attendering bij teveel gewerkte uren (Rekenregels 3.2.3)
  result.attendering = attenderingTeveelUren(reguliereLoonitems);

  // === STAP 3: Kortstondig contract? ===
  const kortstondig = validWerkgevers.length === 1 && validWerkgevers[0].loonitems.length === 1;
  result.steps.push({
    nummer: 3,
    vraag: 'Is er sprake van een kortstondig Contract? (Rekenregels 3.3)',
    antwoord: kortstondig ? 'Ja' : 'Nee',
    detail: kortstondig ? '1 contract met 1 loonitem → C-berekening' : `${validWerkgevers.length} werkgever(s), totaal ${allLoonitems.length} loonitem(s)`,
  });

  // === Per werkgever: stap 4-7 ===
  for (let wIdx = 0; wIdx < validWerkgevers.length; wIdx++) {
    const w = validWerkgevers[wIdx];
    const wLoonitems = sortLoonitems(w.loonitems);
    if (wLoonitems.length === 0) continue;

    const wMostRecent = parsePeriode(wLoonitems[0].periode);
    if (!wMostRecent) continue;

    const periodeDiff = Math.abs(monthsBetween(algemeenMeestRecent.parsedPeriode.end, wMostRecent.end));

    // Stap 4: Vast contract?
    const isCvVast = isVastContractvorm(w.contractvorm);

    const heeftSvLoon = (wLoonitems[0].svLoon || 0) > 0;
    const heeftUren = (wLoonitems[0].uren || 0) > 0;
    const isVast = !w.isUitkering && isCvVast && periodeDiff <= 1 && heeftSvLoon && heeftUren && !kortstondig;
    // Definitie Actief Contract (Rekenregels 5.4): MRL ≤ 1 periode afwijkt van Algemene MRL
    const isActief = periodeDiff <= 1;

    const wResult = {
      werkgever: w,
      werkgeverIdx: wIdx,
      contractId: `${w.id}_0`,
      stappen: [],
      category: null,
      berekening: null,
      isVast,
      isActief,
      periodeDiffMaanden: periodeDiff,
      aantalPeriodes: wLoonitems.length,
    };

    if (kortstondig) {
      wResult.category = 'C';
      wResult.stappen.push({ nummer: 4, vraag: 'Wordt voor dit Contract een Vast Contract vermeld? (Rekenregels 3.4)', antwoord: 'N.v.t.', detail: 'Door kortstondig contract → C-berekening' });
    } else if (!isVast) {
      wResult.category = 'C';
      wResult.stappen.push({
        nummer: 4,
        vraag: 'Wordt voor dit Contract een Vast Contract vermeld? (Rekenregels 3.4)',
        antwoord: 'Nee',
        detail: w.isUitkering ? 'Uitkering → C-berekening' : `${isCvVast ? 'Voldoet niet aan vast-contract criteria' : 'Niet-vaste contractvorm'} → C-berekening`,
      });
    } else {
      wResult.stappen.push({
        nummer: 4,
        vraag: 'Wordt voor dit Contract een Vast Contract vermeld? (Rekenregels 3.4)',
        antwoord: 'Ja',
        detail: `Vaste contractvorm, ${wLoonitems.length} loonitem(s)`,
      });

      // Stap 5: ≥4 periodes?
      const min4 = wLoonitems.length >= 4;
      wResult.stappen.push({
        nummer: 5,
        vraag: 'Werkt de aanvrager minimaal 4 Periodes onder dit Contract? (Rekenregels 3.5)',
        antwoord: min4 ? 'Ja' : 'Nee',
        detail: `${wLoonitems.length} loonitems`,
      });

      if (!min4) {
        wResult.category = 'NONE';
      } else {
        // Stap 6: ≥2 jaar?
        const min24 = wLoonitems.length >= 24;
        wResult.stappen.push({
          nummer: 6,
          vraag: 'Werkt de aanvrager minimaal 2 jaar onder dit Contract? (Rekenregels 3.6)',
          antwoord: min24 ? 'Ja' : 'Nee',
          detail: `${wLoonitems.length} perioden (24 nodig)`,
        });

        if (!min24) {
          wResult.category = 'D';
        } else {
          // Stap 7: bestendig?
          const best = bestendigheidstoets(wLoonitems);
          wResult.bestendigheid = best;
          wResult.stappen.push({
            nummer: 7,
            vraag: 'Is het inkomen van de aanvrager de afgelopen 2 jaar bestendig? (Rekenregels 3.7)',
            antwoord: best.bestendig ? 'Ja' : 'Nee',
            detail: `Inkomensstijging ${best.inkomensstijging.toFixed(2)}% (max 120%). ${best.piekDetail || (best.criterium2 ? 'Geen niet-bestendige pieken.' : '')}`,
          });
          wResult.category = best.bestendig ? 'A' : 'B';
        }
      }
    }

    // Voer berekening uit
    if (wResult.category === 'A') wResult.berekening = berekenA(wLoonitems, result.parttimePercentage);
    else if (wResult.category === 'B') wResult.berekening = berekenB(wLoonitems, result.parttimePercentage);
    else if (wResult.category === 'D') wResult.berekening = berekenD(wLoonitems);

    result.werkgeverResults.push(wResult);
  }

  // === 5.3 C en D Urencriterium ===
  // Indien er een D-berekening is + potentiële C-contracten, mogen die C-contracten
  // ALLEEN meedoen als de gezamenlijke uren per periode ≤ 200 (mnd) of ≤ 184 (vw)
  const dContracten = result.werkgeverResults.filter(wr => wr.category === 'D');
  const heeftDBerekening = dContracten.length > 0;
  let cContracten = result.werkgeverResults.filter(wr => wr.category === 'C');

  if (heeftDBerekening && cContracten.length > 0) {
    // 5.3.1 Aanlevercriteria: C-contracten moeten ≥2 jaar aaneengesloten gewerkt zijn,
    //       elke periode uren > 0, en MRL einddatum >= einddatum D-berekening
    const dEinddatum = dContracten
      .map(wr => parsePeriode(sortLoonitems(wr.werkgever.loonitems)[0]?.periode)?.end)
      .filter(Boolean)
      .reduce((max, d) => (max && max > d) ? max : d, null);

    const cContractenValid = cContracten.filter(wr => {
      if (wr.werkgever.isUitkering) return true; // uitkeringen worden los meegenomen
      const sortedLi = sortLoonitems(wr.werkgever.loonitems);
      if (sortedLi.length === 0) return false;
      const cBetaaltermijn = detecteerBetaaltermijn(sortedLi[0].periode);
      const minPerioden = cBetaaltermijn === 'vierwekelijks' ? 26 : 24;
      // 1. Minimaal 2 jaar aaneengesloten gewerkt
      if (sortedLi.length < minPerioden) return false;
      // 2. Iedere periode uren > 0 (in laatste 2 jaar)
      const heeftAlleUren = sortedLi.slice(0, minPerioden).every(li => (li.uren || 0) > 0);
      if (!heeftAlleUren) return false;
      // 3. MRL einddatum >= einddatum D-berekening
      const cEinddatum = parsePeriode(sortedLi[0].periode)?.end;
      if (dEinddatum && cEinddatum && cEinddatum < dEinddatum) return false;
      // 4. Geen negatieve uren in C-contract
      const heeftNegatieveUren = sortedLi.slice(0, minPerioden).some(li => (li.uren || 0) < 0);
      if (heeftNegatieveUren) return false;
      return true;
    });

    // 5.3.2 Toetsing: tel periode-uren van C-contracten op bij D-uren per periode
    if (cContractenValid.length > 0) {
      // Bepaal C-betaaltermijn (voor urengrens)
      const cBts = cContractenValid
        .filter(wr => !wr.werkgever.isUitkering)
        .map(wr => detecteerBetaaltermijn(sortLoonitems(wr.werkgever.loonitems)[0]?.periode || ''));
      const cBetaaltermijn = cBts.every(b => b === 'vierwekelijks') ? 'vierwekelijks' : 'maandelijks';
      const urenGrens = cBetaaltermijn === 'vierwekelijks' ? 184 : 200;

      // Voor iedere periode van de D-werkgever: D-uren + alle valid C-uren
      // Als ergens > urenGrens → C-contracten gaan NIET mee
      let urenOverschrijding = false;
      for (const dWr of dContracten) {
        const dLi = sortLoonitems(dWr.werkgever.loonitems);
        for (const dPeriode of dLi) {
          const dParsed = parsePeriode(dPeriode.periode);
          if (!dParsed) continue;
          let totaalUrenInPeriode = dPeriode.uren || 0;
          for (const cWr of cContractenValid) {
            if (cWr.werkgever.isUitkering) continue; // uitkeringen niet meetellen voor uren
            // Vind bijpassend C-loonitem (zelfde periode of overlappend)
            const cMatch = cWr.werkgever.loonitems.find(li => {
              const cParsed = parsePeriode(li.periode);
              return cParsed && cParsed.start.getMonth() === dParsed.start.getMonth()
                && cParsed.start.getFullYear() === dParsed.start.getFullYear();
            });
            if (cMatch) totaalUrenInPeriode += (cMatch.uren || 0);
          }
          if (totaalUrenInPeriode > urenGrens) {
            urenOverschrijding = true;
            break;
          }
        }
        if (urenOverschrijding) break;
      }

      if (urenOverschrijding) {
        // C-contracten meegerekend met D zou > 200/184 uren geven → uitsluiten
        cContractenValid.forEach(wr => {
          wr.category = null;
          wr.uitgesloten = `Gezamenlijke uren met D-berekening overschrijden ${urenGrens} u/periode (Rekenregels 5.3)`;
        });
      }
      result.urencriteriumCD = {
        urenGrens,
        cBetaaltermijn,
        overschreden: urenOverschrijding,
        valideContracten: cContractenValid.length,
      };
    }
  }

  // === C-berekening voor alle C-contracten + uitkeringen ===
  cContracten = result.werkgeverResults.filter(wr => wr.category === 'C');
  let cBerekening = null;
  if (cContracten.length > 0) {
    // 5.6.6 Contractoverkoepelende combinatie van betaaltermijnen
    // Bepaal de betaaltermijn van het Meest Recente Loonitem per contract
    const cBetaaltermijnen = cContracten.map(wr => {
      const sortedLi = sortLoonitems(wr.werkgever.loonitems);
      return sortedLi.length > 0 ? detecteerBetaaltermijn(sortedLi[0].periode) : 'maandelijks';
    });
    const allMaandelijks = cBetaaltermijnen.every(bt => bt === 'maandelijks');
    const allVierwekelijks = cBetaaltermijnen.every(bt => bt === 'vierwekelijks');
    const heeftMengvorm = !allMaandelijks && !allVierwekelijks;

    // Per Rekenregels 5.6.6:
    // - Alleen als ALLE vierwekelijks → vierwekelijks gehouden
    // - Anders ALLES omgerekend naar maandelijks (zelfs als algemeen MRL vierwekelijks)
    const doelBt = allVierwekelijks ? 'vierwekelijks' : 'maandelijks';
    let omgerekendCContracten = cContracten;
    if (heeftMengvorm) {
      result.voorbewerking.omrekeningen.push({
        werkgever: 'C-berekening (contractoverkoepelend)',
        naar: doelBt,
        detail: `${cContracten.length} contracten met gemengde betaaltermijnen omgerekend naar ${doelBt} per Rekenregels 5.6.6`,
      });
      // Pas omrekening toe op contracten met afwijkende betaaltermijn
      omgerekendCContracten = cContracten.map((wr, idx) => {
        if (cBetaaltermijnen[idx] === doelBt) return wr;
        // Reken het contract om
        const omgerekendeWerkgever = rekenContractOm(wr.werkgever, doelBt);
        return { ...wr, werkgever: omgerekendeWerkgever };
      });
    }

    const reguliere = omgerekendCContracten.filter(wr => !wr.werkgever.isUitkering)
      .flatMap(wr => wr.werkgever.loonitems);
    const uitkeringen = omgerekendCContracten.filter(wr => wr.werkgever.isUitkering)
      .flatMap(wr => wr.werkgever.loonitems);
    cBerekening = berekenC(reguliere, uitkeringen, result.parttimePercentage);
    cBerekening.betaaltermijn = doelBt;
    cBerekening.omgerekend = heeftMengvorm;
    cContracten.forEach(wr => {
      wr.berekening = cBerekening;
    });
  }

  // === STAP 8 + 9 ===
  let som = 0;
  for (const wr of result.werkgeverResults) {
    if (wr.category !== 'C' && wr.berekening) som += wr.berekening.toetsinkomen;
  }
  if (cBerekening) som += cBerekening.toetsinkomen;
  som = Math.max(0, som);

  result.sumIncome = som;
  result.steps.push({
    nummer: 8,
    vraag: 'Bepaal som van inkomens (Rekenregels 3.8)',
    antwoord: fmtEur(som),
    detail: `${result.werkgeverResults.filter(wr => wr.category !== 'C').length} A/B/D-berekeningen${cBerekening ? ' + 1 C-berekening' : ''}`,
  });

  // Per Rekenregels Appendix 2: bij uitsluitend oproepovereenkomsten geen eigen bijdrage pensioen meenemen
  const allActiveContractsAreOproep = result.werkgeverResults
    .filter(wr => wr.category !== 'D' && !wr.werkgever.isUitkering && wr.berekening)
    .every(wr => isOproepContractvorm(wr.werkgever.contractvorm));
  const heeftActieveContracten = result.werkgeverResults.some(wr => wr.berekening && !wr.werkgever.isUitkering);
  const eigenBijdrageToegestaan = !(heeftActieveContracten && allActiveContractsAreOproep);
  const effectieveEigenBijdrage = eigenBijdrageToegestaan ? (eigenBijdrage || 0) : 0;

  result.finalToetsinkomen = Math.max(0, som - effectieveEigenBijdrage);
  result.steps.push({
    nummer: 9,
    vraag: 'Tel eigen bijdrage pensioenregelingen en verzekeringen (Rekenregels 3.9)',
    antwoord: fmtEur(effectieveEigenBijdrage),
    detail: eigenBijdrageToegestaan
      ? `${fmtEur(som)} -/- ${fmtEur(effectieveEigenBijdrage)} = ${fmtEur(result.finalToetsinkomen)}`
      : 'In geval van uitsluitend actieve oproepovereenkomsten wordt een Eigen bijdrage pensioenregeling en/of verzekeringen niet meegenomen in de berekening.',
  });

  // Pensioen >15% waarschuwing (per API spec)
  const tisExclEigen = som; // toetsinkomen exclusief eigen bijdrage
  const pensioenIsHoog = tisExclEigen > 0 && (effectieveEigenBijdrage * 12 / tisExclEigen) > 0.15;
  result.eigenBijdrageWaarschuwing = pensioenIsHoog
    ? 'Let op: de berekende Eigen bijdrage pensioenregeling en/of verzekeringen bedraagt meer dan 15% van het toetsinkomen exclusief Eigen bijdrage pensioenregeling en/of verzekeringen.'
    : null;
  result.eigenBijdrageNietToegepast = !eigenBijdrageToegestaan && (eigenBijdrage || 0) > 0
    ? 'In geval van uitsluitend actieve oproepovereenkomsten wordt een Eigen bijdrage pensioenregeling en/of verzekeringen niet meegenomen in de berekening.'
    : null;

  // Bouw samenstelling string
  const vastSet = new Set();
  const nietVastSet = new Set();
  result.werkgeverResults.forEach(wr => {
    if (!wr.berekening) return;
    if (wr.category === 'C') {
      const hasVast = cContracten.some(c => c.isVast);
      const hasNietVast = cContracten.some(c => !c.isVast);
      if (hasVast) vastSet.add('C');
      if (hasNietVast) nietVastSet.add('C');
    } else {
      vastSet.add(wr.category);
    }
  });

  const formatCat = (c, isPt) => isPt && c !== 'D' ? c + '2' : c;
  const parts = [];
  if (vastSet.size > 0) parts.push(`Vast: ${[...vastSet].map(c => formatCat(c, result.isParttime)).join('-')}`);
  if (nietVastSet.size > 0) parts.push(`Niet vast: ${[...nietVastSet].map(c => formatCat(c, result.isParttime)).join('-')}`);
  result.samenstelling = parts.join(', ');

  // Omschrijving
  const primaryCat = [...vastSet][0] || [...nietVastSet][0];
  const omschrijvingen = {
    A: 'Het toetsinkomen is gebaseerd op het SV-loon van het afgelopen jaar bij de huidige werkgever.',
    B: 'Het toetsinkomen is gebaseerd op het SV-loon van de afgelopen 2 jaar bij de huidige werkgever.',
    C: 'Het toetsinkomen is gebaseerd op het SV-loon van de afgelopen 3 jaar uit loondienst en eventuele uitkeringen.',
    D: 'Het toetsinkomen is gebaseerd op het laagste SV-loon van de afgelopen 4 perioden vermenigvuldigd met 12.',
  };
  result.omschrijving = omschrijvingen[primaryCat] || '';
  if (result.isParttime) {
    result.omschrijving += ' Omdat de aanvrager afgelopen 3 maanden minder uren heeft gewerkt, is het toetsinkomen hiervoor gecorrigeerd.';
  }
  result.omschrijving += ` (${result.samenstelling})`;

  result.success = true;
  result.cBerekening = cBerekening;
  result.primaryCategory = result.isParttime && primaryCat && primaryCat !== 'D' ? primaryCat + '2' : primaryCat;

  // Bouw API response structuur conform officiele v10 spec
  result.apiResponse = {
    requestUuid: null, // wordt later gevuld door verifCode
    uwvInsuranceReportPerson: aanvragerNaam || null,
    uwvInsuranceReportCertificateInformation: {
      signatureDate: peildatum ? peildatum.toISOString() : null,
      signatureIsValid: !!peildatum,
      signatureIsNotOlderThan3Months: !!peildatum && (Date.now() - peildatum.getTime()) < 90 * 24 * 60 * 60 * 1000,
      signatureIsValidForAtLeast3Weeks: !!peildatum,
      signatureHash: null, // mock — vereist echte PKI verificatie
    },
    iblToolVersion: API_VERSIE,
    inputPersonalContributionToPensionOrInsurance: eigenBijdrage || 0,
    isCalculationSuccesful: true,
    calculationError: null,
    calculationResult: {
      usedIBLCalculationRulesVersion: REKENREGELS_VERSIE,
      calculatedIBLIncomeResult: result.finalToetsinkomen,
      calculatedPersonalContributionToPensionOrInsurance: effectieveEigenBijdrage,
      calculationCategory: result.samenstelling,
      calculationExplanation: result.omschrijving,
      calculationDetailsV8: {
        mostRecentPeriodsDetails: result.werkgeverResults.map(wr => ({
          calculationCategory: wr.category,
          employer: wr.werkgever.naam,
          contractType: wr.werkgever.contractvorm,
          calculatedIBLIncomeResultEmployer: wr.berekening?.toetsinkomen ?? 0,
          salaryItems: (wr.berekening?.mitigated || []).map(p => ({
            original: p.svLoon,
            mitigated: p.mitigatedSvLoon ?? p.svLoon,
          })),
        })),
      },
    },
  };

  return result;
}


// ============================================================
// PUBLIC API — high-level helper functions for the integrated tool
// ============================================================

/**
 * Hoog-niveau helper: parse een UWV PDF en bereken direct het toetsinkomen.
 * Returns { parsed, resultaat } of { error }.
 *
 * @param {File} file - de geüploade UWV PDF
 * @param {number} eigenBijdrage - eigen pensioenbijdrage in euro per jaar
 */
async function parseAndCalculate(file, eigenBijdrage = 0) {
  if (!window.pdfjsLib) {
    throw new Error('PDF.js is nog niet geladen. Wacht een moment en probeer opnieuw.');
  }
  const text = await extractTextFromPdf(file);
  const parsed = parseVerzekeringsbericht(text);
  if (!parsed.werkgevers || parsed.werkgevers.length === 0) {
    return {
      parsed,
      error: 'Geen werkgever-blokken gevonden in PDF. Is dit wel een UWV Verzekeringsbericht?',
    };
  }
  const resultaat = berekenToetsinkomen({
    werkgevers: parsed.werkgevers,
    eigenBijdrage: eigenBijdrage || 0,
    peildatum: parsed.aanmaakdatum || new Date(),
    aanvragerNaam: parsed.aanvragerNaam,
  });
  return { parsed, resultaat };
}

/**
 * Map een UWV-contractvorm naar de Dossiercompleet-keuzes
 * (vast / tijdelijk-verklaring / tijdelijk / zzp / dga / pensioen)
 */
function mapContractvormNaarDossier(contractvorm, isUitkering) {
  if (isUitkering) return 'pensioen'; // best fit voor uitkering
  if (!contractvorm) return '';
  const cv = contractvorm.toLowerCase();
  // Een 'oproep'-contract = oproepovereenkomst maar NIET 'geen oproepovereenkomst'
  const isOproep = /\boproep/.test(cv) && !/geen\s+oproep/.test(cv);
  // Onbepaalde tijd zonder oproep → vast
  if (cv.includes('onbepaalde tijd') && !isOproep) return 'vast';
  if (cv.includes('publiekrechtelijke aanstelling voor onbepaalde tijd') && !isOproep) return 'vast';
  // Bepaalde tijd óf oproep-contract → tijdelijk
  if (cv.includes('bepaalde tijd') || isOproep) return 'tijdelijk';
  return '';
}

/**
 * Splits 'De heer J. Oversteegen' of 'Mevrouw J. van der Berg' op in
 * { aanhef, voornaam, tussenvoegsel, achternaam }. Voornaam is hier de initiaal.
 */
function splitsAanvragerNaam(volledig) {
  if (!volledig) return { aanhef: '', voornaam: '', tussenvoegsel: '', achternaam: '' };
  const s = volledig.trim();
  // Verwijder aanhef
  let rest = s;
  let aanhef = '';
  const aanhefMatch = s.match(/^(De\s+heer|Mevrouw|Mevr\.|Dhr\.|Mw\.)\s+(.+)$/i);
  if (aanhefMatch) {
    aanhef = aanhefMatch[1];
    rest = aanhefMatch[2];
  }
  // Initiaal(en) extracten
  let voornaam = '';
  const initMatch = rest.match(/^([A-Z]\.(?:[A-Z]\.)?)\s+(.+)$/);
  if (initMatch) {
    voornaam = initMatch[1];
    rest = initMatch[2];
  }
  // Tussenvoegsel: lowercase woorden vooraan
  let tussenvoegsel = '';
  const tvMatch = rest.match(/^((?:[a-z]+\s+)+)(.+)$/);
  if (tvMatch) {
    tussenvoegsel = tvMatch[1].trim();
    rest = tvMatch[2];
  }
  return { aanhef, voornaam, tussenvoegsel, achternaam: rest.trim() };
}

/**
 * Format date for HTML date input (YYYY-MM-DD)
 */
function dateToInputString(date) {
  if (!date || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ============================================================
// EXPORTS
// ============================================================

export {
  // High-level helpers
  parseAndCalculate,
  mapContractvormNaarDossier,
  splitsAanvragerNaam,
  dateToInputString,
  // Lower-level functions for advanced use
  extractTextFromPdf,
  parseVerzekeringsbericht,
  berekenToetsinkomen,
  // Formatting helpers
  fmtEur,
  fmtEurShort,
  // Constants
  REKENREGELS_VERSIE,
  API_VERSIE,
  FRONTEND_API_VERSIE,
};
