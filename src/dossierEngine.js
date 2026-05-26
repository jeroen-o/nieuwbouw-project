// ============================================================
// Dossier Engine — Maximale hypotheek calculator
// Conform NIBUD/AFM financieringslastnormen 2026
// Geëxtraheerd en aangepast uit Dossiercompleet.nl
// ============================================================

// === NIBUD/AFM 2026 financieringslastpercentages — Niet-AOW (WQN) ===
// Kolommen: [<=1.5%, 1.5-2%, 2-2.5%, 2.5-3%, 3-3.5%, 3.5-4%, 4-4.5%, 4.5-5%, 5-5.5%, 5.5-6%, 6-6.5%, >=6.5%]
const WQN = [[30000,[155,165,175,184,193,201,209,216,222,227,232,237]],[31000,[162,173,183,193,202,212,220,227,234,241,246,251]],[32000,[167,179,190,201,211,221,230,238,246,253,259,264]],[33000,[171,183,195,206,216,226,236,246,254,261,268,274]],[34000,[173,185,196,206,216,226,236,246,255,264,273,281]],[35000,[174,185,196,206,216,226,236,246,255,264,273,281]],[36000,[174,185,196,206,216,226,236,246,255,264,273,281]],[37000,[174,185,196,206,216,226,236,246,255,264,273,281]],[38000,[174,185,196,206,216,226,236,246,255,264,273,281]],[39000,[174,185,196,206,216,226,236,246,255,264,273,281]],[40000,[174,185,196,206,216,226,236,246,255,264,273,281]],[41000,[174,185,196,206,216,226,236,246,255,264,273,281]],[42000,[174,185,196,206,216,226,236,246,255,264,273,281]],[43000,[174,185,196,206,216,226,236,246,255,264,273,281]],[44000,[174,185,196,206,216,226,236,246,255,264,273,281]],[45000,[174,185,196,206,216,226,236,246,255,264,273,281]],[46000,[174,185,196,206,216,226,236,246,255,264,273,281]],[47000,[174,185,196,206,216,226,236,246,255,264,273,281]],[48000,[174,185,196,206,216,226,236,246,255,264,273,281]],[49000,[174,185,196,206,216,226,236,246,255,264,273,281]],[50000,[174,185,196,206,216,226,236,246,255,264,273,281]],[51000,[174,185,196,206,216,226,236,246,255,264,273,281]],[52000,[174,185,196,206,216,226,236,246,255,264,273,281]],[53000,[174,185,196,206,216,226,236,246,255,264,273,281]],[54000,[174,185,196,206,216,226,236,246,255,264,273,281]],[55000,[174,185,196,206,216,226,236,246,255,264,273,281]],[56000,[174,185,196,206,216,226,236,246,255,264,273,281]],[57000,[175,185,196,206,216,226,236,246,255,264,273,281]],[58000,[176,186,196,206,216,226,236,246,255,264,273,281]],[59000,[176,186,196,206,216,226,236,246,255,264,273,281]],[60000,[177,187,197,207,216,226,236,246,255,264,273,281]],[61000,[177,187,197,207,217,226,236,246,255,264,273,281]],[62000,[178,188,198,207,217,227,236,246,255,264,273,281]],[63000,[178,189,199,209,218,227,237,246,255,264,273,281]],[64000,[179,189,199,210,219,228,237,246,255,264,273,281]],[65000,[180,190,200,210,220,229,238,247,255,264,273,281]],[66000,[181,191,201,211,221,230,239,247,256,264,273,281]],[67000,[182,192,202,212,222,231,240,248,257,265,273,281]],[68000,[183,194,204,214,223,232,241,250,258,267,274,282]],[69000,[185,195,205,215,225,234,243,251,260,268,276,283]],[70000,[186,197,207,217,227,236,245,253,262,270,278,285]],[71000,[188,199,209,219,229,238,247,256,264,272,280,287]],[72000,[190,200,211,221,231,241,250,258,266,274,282,289]],[73000,[191,202,213,223,233,243,252,260,269,276,284,292]],[74000,[193,204,215,225,235,245,254,263,271,279,286,293]],[75000,[194,205,216,226,237,246,256,264,273,281,288,295]],[76000,[195,206,217,228,238,248,257,266,275,282,290,297]],[77000,[196,208,219,229,240,249,259,268,276,284,292,299]],[78000,[197,209,220,231,241,251,261,270,278,286,294,301]],[79000,[198,209,221,232,242,252,262,271,279,287,295,302]],[80000,[199,210,222,232,243,253,263,272,281,289,296,303]],[81000,[200,211,222,233,243,254,264,273,281,290,297,304]],[82000,[201,212,223,234,244,254,264,273,282,290,298,305]],[83000,[201,212,223,234,244,254,264,274,282,291,299,306]],[84000,[202,213,224,234,245,255,265,274,283,291,299,306]],[85000,[202,213,224,235,245,255,265,274,283,292,299,307]],[86000,[202,214,225,235,246,256,265,274,284,292,300,307]],[87000,[203,214,225,236,246,256,266,275,284,292,300,308]],[88000,[204,215,225,236,246,256,266,275,284,293,301,308]],[89000,[205,215,226,237,247,257,266,276,284,293,301,308]],[90000,[205,216,226,237,247,257,267,276,285,293,301,309]],[91000,[205,216,227,237,248,258,267,276,285,293,302,309]],[92000,[206,217,227,238,248,258,268,277,286,294,302,310]],[93000,[207,217,228,238,248,258,268,277,286,294,302,310]],[94000,[208,218,228,239,249,259,269,278,286,295,302,310]],[95000,[208,219,229,239,250,259,269,278,287,295,303,310]],[96000,[209,219,230,240,250,260,269,279,287,295,303,310]],[97000,[210,220,230,240,250,260,270,279,288,296,304,311]],[98000,[210,221,231,241,251,261,270,279,288,296,304,311]],[99000,[211,221,232,242,251,261,271,280,288,296,304,312]],[100000,[211,222,232,242,252,261,271,280,289,297,305,312]],[101000,[212,222,233,243,253,262,271,280,289,297,305,312]],[102000,[212,223,234,244,253,263,271,281,289,298,305,313]],[103000,[213,224,234,244,254,263,272,281,290,298,306,313]],[104000,[213,224,235,245,255,264,273,281,290,298,306,313]],[105000,[213,225,235,245,255,265,273,282,291,299,306,314]],[106000,[214,225,236,246,256,265,274,282,291,299,307,314]],[107000,[214,225,237,247,256,266,275,283,291,300,307,315]],[108000,[215,226,237,247,257,267,275,284,292,300,308,315]],[109000,[215,226,237,248,258,267,276,284,292,300,308,315]],[110000,[216,227,237,248,258,267,277,285,293,300,308,315]],[111000,[216,227,238,248,259,268,277,285,293,301,308,316]],[112000,[217,228,238,249,259,268,277,286,294,301,309,316]],[113000,[217,228,239,249,259,269,278,287,294,302,309,317]],[114000,[218,229,239,250,259,269,278,287,295,302,309,317]],[115000,[218,229,240,250,260,269,279,287,295,303,310,317]],[116000,[218,229,240,250,260,270,279,288,296,303,310,317]],[117000,[219,230,241,251,261,270,280,288,296,304,311,318]],[118000,[219,230,241,251,261,271,280,289,297,304,311,318]],[119000,[220,231,241,252,262,271,280,289,297,305,312,319]],[120000,[220,231,242,252,262,272,281,289,298,305,313,319]],[121000,[220,232,242,253,263,272,281,290,298,306,313,320]],[122000,[221,232,243,253,263,273,282,290,299,306,314,320]],[123000,[221,232,243,254,264,273,282,291,299,307,314,321]],[124000,[222,233,244,254,264,274,283,291,299,308,315,321]],[125000,[222,233,244,255,265,274,283,292,300,308,315,322]]];

// === NIBUD/AFM 2026 — AOW-gerechtigd (WQW) ===
const WQW = [[29000,[185,189,194,197,201,204,207,209,211,213,215,217]],[30000,[192,198,203,208,211,215,218,221,223,225,227,229]],[31000,[199,206,212,217,221,225,228,231,234,237,239,241]],[32000,[205,212,218,224,230,234,238,241,244,247,249,252]],[33000,[209,217,223,229,235,240,245,248,252,255,257,260]],[34000,[212,220,228,234,240,245,251,255,259,262,265,267]],[35000,[216,224,231,239,245,251,256,261,265,269,272,275]],[36000,[218,227,235,243,249,256,261,266,271,275,279,282]],[37000,[219,229,238,246,253,260,266,271,275,280,284,288]],[38000,[220,231,240,249,257,263,270,275,280,284,289,292]],[39000,[221,232,242,251,259,266,273,279,284,289,293,297]],[40000,[222,233,243,252,261,269,276,282,288,293,297,301]],[41000,[223,234,244,253,263,271,279,285,291,296,301,305]],[42000,[224,235,245,255,264,273,281,288,294,300,305,309]],[43000,[225,236,246,256,266,274,283,290,297,303,308,313]],[44000,[227,237,248,258,267,276,284,292,299,306,311,316]],[45000,[228,239,249,259,268,277,286,294,301,308,314,319]],[46000,[229,240,250,260,269,279,287,295,303,309,316,322]],[47000,[231,241,252,261,271,280,289,297,304,311,318,324]],[48000,[231,243,253,263,273,282,290,299,306,313,320,326]],[49000,[233,244,255,265,275,283,292,300,308,315,322,328]],[50000,[234,246,256,267,276,286,294,302,310,317,324,330]],[51000,[236,248,258,268,279,288,297,305,313,320,327,333]],[52000,[239,250,262,272,281,291,300,308,316,323,330,337]],[53000,[242,254,265,275,285,294,304,312,320,327,335,341]],[54000,[245,257,268,279,289,298,307,316,324,332,339,345]],[55000,[248,260,272,283,293,303,311,320,329,336,343,350]],[56000,[250,264,276,286,297,307,316,324,332,340,347,355]],[57000,[252,266,279,290,300,311,320,328,337,344,352,359]],[58000,[253,268,281,294,304,314,324,333,341,348,355,363]],[59000,[254,270,284,296,308,318,328,337,345,353,360,366]],[60000,[255,271,286,299,311,321,331,341,349,357,364,371]],[61000,[256,272,287,301,314,325,335,344,353,361,368,375]],[62000,[257,273,289,304,316,328,338,348,357,365,372,379]],[63000,[258,274,290,305,319,330,341,351,360,368,376,383]],[64000,[258,276,291,307,321,333,344,354,363,372,379,386]],[65000,[259,276,292,308,323,336,346,356,366,375,383,390]],[66000,[259,276,294,309,324,338,349,360,368,378,386,393]],[67000,[260,277,294,310,325,340,352,362,371,380,389,397]],[68000,[260,277,295,311,326,341,354,364,375,383,392,400]],[69000,[261,278,295,312,327,342,356,367,377,386,394,403]],[70000,[262,279,296,313,328,343,357,369,379,389,397,405]],[71000,[262,279,296,313,329,344,358,371,382,391,399,407]],[72000,[263,280,297,314,330,345,359,373,384,394,403,410]],[73000,[264,280,297,314,331,346,360,373,384,395,405,413]],[74000,[265,281,297,314,331,347,361,373,384,395,406,416]],[75000,[265,282,298,314,331,348,361,373,384,395,406,417]],[76000,[266,283,299,315,332,348,361,373,384,395,406,417]],[77000,[267,283,300,316,332,348,361,373,384,395,406,417]],[78000,[268,284,300,316,333,348,361,373,384,395,406,417]],[79000,[269,285,301,317,333,348,361,373,384,395,406,417]],[80000,[271,285,301,317,333,348,361,373,384,395,406,417]],[81000,[272,286,302,318,334,348,361,373,384,395,406,417]],[82000,[272,288,302,319,334,348,361,373,384,395,406,417]],[83000,[273,288,303,319,334,348,361,373,384,395,406,417]],[84000,[274,289,304,319,334,348,361,373,384,395,406,417]],[85000,[275,290,304,319,334,348,361,373,384,395,406,417]],[86000,[276,291,305,319,334,348,361,373,384,395,406,417]],[87000,[277,291,306,320,334,348,361,373,384,395,406,417]],[88000,[277,292,306,320,334,348,361,373,384,395,406,417]],[89000,[277,292,306,320,334,348,361,373,384,395,406,417]],[90000,[277,292,306,321,334,348,361,373,384,395,406,417]],[91000,[278,292,307,321,334,348,361,373,384,395,406,417]],[92000,[278,293,307,321,334,348,361,373,384,395,406,417]],[93000,[278,293,307,321,335,348,361,373,384,395,406,417]],[94000,[278,293,307,321,335,348,361,373,384,395,406,417]],[95000,[279,293,308,321,335,348,361,373,384,395,406,417]],[96000,[279,294,308,322,335,348,361,373,384,395,406,417]],[97000,[279,294,308,322,335,348,361,373,384,395,406,417]],[98000,[280,294,308,322,336,348,361,373,384,395,406,417]],[99000,[280,294,309,322,336,349,361,373,384,395,406,417]],[100000,[280,295,309,323,336,349,361,373,384,395,406,417]],[101000,[281,295,309,323,336,349,361,373,384,395,406,417]],[102000,[281,295,309,323,336,349,361,373,384,395,406,417]],[103000,[281,296,309,323,337,349,362,373,384,395,406,417]],[104000,[282,296,310,323,337,350,362,374,385,395,406,417]],[105000,[282,296,310,324,337,350,362,374,385,395,406,417]],[106000,[282,296,310,324,337,350,362,374,385,395,406,417]],[107000,[283,297,311,324,337,350,363,374,385,396,406,417]],[108000,[283,297,311,325,338,351,363,374,385,396,406,417]],[109000,[283,297,311,325,338,351,363,375,385,396,406,417]],[110000,[284,298,312,325,338,351,363,375,386,396,406,417]]];

// Brutering studieschuld per rente-bracket
const BRUTERING = [1.05, 1.05, 1.10, 1.15, 1.20, 1.20, 1.25, 1.30, 1.30, 1.35, 1.40, 1.40];

// AOW-tabel SVB 2026
const AOW_TABEL = [
  ['1956-06-01', '1957-02-28', 66, 10],
  ['1957-03-01', '1960-12-31', 67, 0],
  ['1961-01-01', '1966-09-30', 67, 3],
  ['1966-10-01', '1970-06-30', 67, 6],
  ['1970-07-01', '1973-03-31', 67, 9],
  ['1973-04-01', '1975-12-31', 68, 0],
  ['1976-01-01', '1978-09-30', 68, 3],
  ['1978-10-01', '1982-06-30', 68, 6],
  ['1982-07-01', '1985-03-31', 68, 9],
  ['1985-04-01', '1988-12-31', 69, 0],
  ['1989-01-01', '1991-09-30', 69, 3],
  ['1991-10-01', '1995-06-30', 69, 6],
  ['1995-07-01', '1999-03-31', 69, 9],
  ['1999-04-01', '2000-12-31', 70, 0],
];

// Energielabel-bonus (AFM 2026)
const ENERGY_BONUS = { 'A++++': 40000, 'A+++': 25000, 'A++': 20000, 'A+': 20000, 'A': 10000, 'B': 10000 };

// === Helper functies ===
export const isFilled = (v) => v !== '' && v !== null && v !== undefined;
export const num = (v) => parseFloat(String(v).replace(/\./g, '').replace(/,/g, '.')) || 0;
export const fmtNum = (n) => new Intl.NumberFormat('nl-NL').format(n);
export const fmtCur = (n) => '€ ' + new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 }).format(Math.round(n || 0));

export function ageFrom(date) {
  if (!date) return 0;
  const d = new Date(date);
  if (isNaN(d)) return 0;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export function aowLeeftijd(geb) {
  if (!geb) return null;
  for (const [vanaf, tot, jr, mnd] of AOW_TABEL) {
    if (geb >= vanaf && geb <= tot) return { jaren: jr, maanden: mnd, officieel: true };
  }
  if (geb < '1956-06-01') return null;
  return { jaren: 70, maanden: 0, officieel: false };
}

export function aowDatum(date) {
  if (!date) return null;
  const leeftijd = aowLeeftijd(date);
  if (!leeftijd) return null;
  const d = new Date(date);
  if (isNaN(d)) return null;
  const aow = new Date(d);
  aow.setFullYear(aow.getFullYear() + leeftijd.jaren);
  aow.setMonth(aow.getMonth() + leeftijd.maanden);
  return { datum: aow, officieel: leeftijd.officieel, jaren: leeftijd.jaren, maanden: leeftijd.maanden };
}

export function isAOWGerechtigd(geboorte) {
  if (!geboorte) return false;
  const aow = aowDatum(geboorte);
  if (!aow) return true;
  return new Date() >= aow.datum;
}

function renteKolom(rente) {
  if (rente <= 0.0150) return 0;
  if (rente <= 0.0200) return 1;
  if (rente <= 0.0250) return 2;
  if (rente <= 0.0300) return 3;
  if (rente <= 0.0350) return 4;
  if (rente <= 0.0400) return 5;
  if (rente <= 0.0450) return 6;
  if (rente <= 0.0500) return 7;
  if (rente <= 0.0550) return 8;
  if (rente <= 0.0600) return 9;
  if (rente <= 0.0650) return 10;
  return 11;
}

const TOETSRENTE = 0.05;

function lookupWoonquote(inkomen, isAOW, rente) {
  const tabel = isAOW ? WQW : WQN;
  if (inkomen < tabel[0][0]) return 0;
  const kolom = renteKolom(rente);
  let wq = tabel[0][1][kolom];
  for (const [inc, pcts] of tabel) {
    if (inkomen >= inc) wq = pcts[kolom];
    else break;
  }
  return wq / 1000;
}

/**
 * Bereken de maximale hypotheek conform NIBUD/AFM 2026.
 *
 * @param {Object} state - dossier-state met alle ingevulde velden
 * @returns {number} maximale hypotheek in euro
 */
export function calcMaxLoan(state) {
  const pensInkomen = num(state.pensioen1) + num(state.pensioen2);
  const totalGross = num(state.brutoA1) + num(state.brutoA2) + pensInkomen;
  if (totalGross < 22000) return 0;

  const a1AOW = isAOWGerechtigd(state.a1Geboorte);
  const a2AOW = state.samen === 'ja' ? isAOWGerechtigd(state.a2Geboorte) : true;
  const isAOW = state.samen === 'ja' ? (a1AOW && a2AOW) : a1AOW;

  const tr = TOETSRENTE;
  const wq = lookupWoonquote(totalGross, isAOW, tr);
  if (wq === 0) return 0;

  let monthly = (totalGross / 12) * wq;
  const bFactor = BRUTERING[renteKolom(tr)];
  const studieLast = (num(state.studie1Hoofdsom) + num(state.studie2Hoofdsom)) * 0.0065 * bFactor;
  monthly -= studieLast;
  monthly -= num(state.bkrLimit) * 0.02;
  monthly -= num(state.leningMaand);
  monthly -= num(state.leaseMaand);
  monthly -= num(state.alimPartner);
  monthly -= num(state.alimKind);
  if (state.h1Status === 'lopend') monthly -= num(state.h1Rest || state.h1Hoofdsom) * 0.005;
  if (state.h2Status === 'lopend') monthly -= num(state.h2Rest || state.h2Hoofdsom) * 0.005;
  monthly = Math.max(0, monthly);

  const r = tr / 12;
  const annuity = (1 - Math.pow(1 + r, -360)) / r;
  let loan = monthly * annuity;

  loan += ENERGY_BONUS[state.energielabel] || 0;
  if (state.samen === 'nee') loan += 17000;

  if (state.bkrCodering === 'A') loan = 0;
  else if (state.bkrCodering === 'H') loan *= 0.75;

  return Math.max(0, loan);
}

/**
 * Bepaal de relevante velden op basis van wat al ingevuld is
 * (gebruikt voor compleetheids-percentage)
 */
export function relevanteVelden(state) {
  const fields = [];
  // Aanvrager 1 — altijd
  fields.push('a1Voornaam','a1Achternaam','a1Geboorte','a1Email','a1Postcode','a1Huisnr','a1Telefoon');
  // Samen kopen?
  fields.push('samen');
  // Aanvrager 2 — alleen bij samen=ja
  if (state.samen === 'ja') {
    fields.push('a2Voornaam','a2Achternaam','a2Geboorte','a2Email','a2Postcode','a2Huisnr','a2Telefoon');
  }
  // Historie A1
  fields.push('h1Gehad');
  if (state.h1Gehad === 'ja') {
    fields.push('h1Status');
    if (state.h1Status === 'lopend') fields.push('h1Hoofdsom','h1Rest','h1Startdatum');
  }
  // Historie A2
  if (state.samen === 'ja') {
    fields.push('h2Gehad');
    if (state.h2Gehad === 'ja') {
      fields.push('h2Status');
      if (state.h2Status === 'lopend') fields.push('h2Hoofdsom','h2Rest','h2Startdatum');
    }
  }
  // Woning
  fields.push('aankoopType','koopsom','meerwerk','energielabel','oplevering','huidigeWonen');
  if (state.aankoopType === 'nieuwbouw') fields.push('bouwperiode');
  // Inkomen A1
  fields.push('brutoA1','contractA1');
  if (isFilled(state.a1Geboorte) && ageFrom(state.a1Geboorte) >= 55) fields.push('pensioen1');
  // Inkomen A2
  if (state.samen === 'ja') {
    fields.push('brutoA2','contractA2');
    if (isFilled(state.a2Geboorte) && ageFrom(state.a2Geboorte) >= 55) fields.push('pensioen2');
  }
  // Eigen geld
  fields.push('spaargeld');

  // Verplichtingen — progressief: vervolgvragen verschijnen pas zodra eerdere zijn beantwoord
  fields.push('studie1Heeft');
  if (state.studie1Heeft === 'ja') fields.push('studie1Hoofdsom','studie1Rest');
  if (state.samen === 'ja') {
    if (isFilled(state.studie1Heeft)) {
      fields.push('studie2Heeft');
      if (state.studie2Heeft === 'ja') fields.push('studie2Hoofdsom','studie2Rest');
    }
  }
  const studie1Klaar = isFilled(state.studie1Heeft);
  const studie2Klaar = state.samen !== 'ja' || isFilled(state.studie2Heeft);
  if (studie1Klaar && studie2Klaar) {
    fields.push('heeftLening');
    if (state.heeftLening === 'ja') fields.push('leningBedrag','leningMaand');
  }
  if (studie1Klaar && studie2Klaar && isFilled(state.heeftLening)) {
    fields.push('heeftBkr');
    if (state.heeftBkr === 'ja') fields.push('bkrLimit');
  }
  if (studie1Klaar && studie2Klaar && isFilled(state.heeftLening) && isFilled(state.heeftBkr)) {
    fields.push('heeftLease');
    if (state.heeftLease === 'ja') fields.push('leaseMaand');
  }
  if (studie1Klaar && studie2Klaar && isFilled(state.heeftLening) && isFilled(state.heeftBkr) && isFilled(state.heeftLease)) {
    fields.push('heeftAlimentatie');
    if (state.heeftAlimentatie === 'ja') fields.push('alimPartner','alimKind');
  }
  if (studie1Klaar && studie2Klaar && isFilled(state.heeftLening) && isFilled(state.heeftBkr) && isFilled(state.heeftLease) && isFilled(state.heeftAlimentatie)) {
    fields.push('bkrCodering');
  }

  return fields;
}

export function calcPct(state) {
  const fields = relevanteVelden(state);
  if (fields.length === 0) return 0;
  const ingevuld = fields.filter((f) => isFilled(state[f])).length;
  return Math.round((ingevuld / fields.length) * 100);
}

/**
 * Bepaal of een sectie volledig is ingevuld
 */
export function sectionComplete(id, state) {
  switch (id) {
    case 'a1':
      return ['a1Voornaam','a1Achternaam','a1Geboorte','a1Email','a1Postcode','a1Huisnr','a1Telefoon'].every((k) => isFilled(state[k]));
    case 'partner':
      return isFilled(state.samen);
    case 'a2':
      return state.samen === 'nee' || ['a2Voornaam','a2Achternaam','a2Geboorte','a2Email','a2Postcode','a2Huisnr','a2Telefoon'].every((k) => isFilled(state[k]));
    case 'historie1': {
      if (!isFilled(state.h1Gehad)) return false;
      if (state.h1Gehad === 'nee') return true;
      if (!isFilled(state.h1Status)) return false;
      if (state.h1Status === 'lopend')
        return isFilled(state.h1Hoofdsom) && isFilled(state.h1Rest) && isFilled(state.h1Startdatum);
      return true;
    }
    case 'historie2': {
      if (state.samen === 'nee') return true;
      if (!isFilled(state.h2Gehad)) return false;
      if (state.h2Gehad === 'nee') return true;
      if (!isFilled(state.h2Status)) return false;
      if (state.h2Status === 'lopend')
        return isFilled(state.h2Hoofdsom) && isFilled(state.h2Rest) && isFilled(state.h2Startdatum);
      return true;
    }
    case 'woning':
      return ['koopsom','meerwerk','energielabel','oplevering','huidigeWonen'].every((k) => isFilled(state[k])) && isFilled(state.aankoopType);
    case 'inkomen1':
      return ['brutoA1','contractA1'].every((k) => isFilled(state[k]));
    case 'inkomen2':
      return state.samen === 'nee' || ['brutoA2','contractA2'].every((k) => isFilled(state[k]));
    case 'geld':
      return isFilled(state.spaargeld);
    case 'verplichtingen': {
      if (!isFilled(state.studie1Heeft)) return false;
      if (state.studie1Heeft === 'ja' && (!isFilled(state.studie1Hoofdsom) || !isFilled(state.studie1Rest))) return false;
      if (state.samen === 'ja') {
        if (!isFilled(state.studie2Heeft)) return false;
        if (state.studie2Heeft === 'ja' && (!isFilled(state.studie2Hoofdsom) || !isFilled(state.studie2Rest))) return false;
      }
      if (!isFilled(state.heeftLening) || !isFilled(state.heeftBkr) || !isFilled(state.heeftLease) || !isFilled(state.heeftAlimentatie)) return false;
      if (state.heeftLening === 'ja' && (!isFilled(state.leningBedrag) || !isFilled(state.leningMaand))) return false;
      if (state.heeftBkr === 'ja' && !isFilled(state.bkrLimit)) return false;
      if (state.heeftLease === 'ja' && !isFilled(state.leaseMaand)) return false;
      if (state.heeftAlimentatie === 'ja' && (!isFilled(state.alimPartner) || !isFilled(state.alimKind))) return false;
      if (!isFilled(state.bkrCodering)) return false;
      return true;
    }
    default:
      return false;
  }
}

/**
 * Aankoopbegroting berekening
 * @returns {Object} met koopsom, meerwerk, ob, notaris, tax, advies, nhg, bouw, dubbel, totaalBehoefte, totaalMiddelen, saldo
 */
export function calcBegroting(state, maxLoan) {
  const koopsom = num(state.koopsom);
  const meerwerk = num(state.meerwerk);
  const isNieuwbouw = state.aankoopType === 'nieuwbouw';
  const ob = isNieuwbouw ? 0 : Math.round(koopsom * 0.02);
  const notaris = 1500;
  const tax = isNieuwbouw ? 0 : 800;
  const advies = 3500;
  // NHG-kostengrens 2026: € 470.000 (was € 450.000 in 2025)
  // Met Energie Besparende Voorzieningen: € 498.200
  const NHG_GRENS_2026 = 470000;
  const nhgBase = Math.min(maxLoan, NHG_GRENS_2026);
  const useNhg = nhgBase > 0;
  const nhg = useNhg ? Math.round(nhgBase * 0.004) : 0;
  const bouwperiode = num(state.bouwperiode) || 18;
  const bouw = isNieuwbouw ? Math.round(maxLoan * 0.05 * (bouwperiode / 12) * 0.5) : 0;
  const dubbel = state.huidigeWonen === 'koop' ? Math.round(koopsom * 0.05 * 0.5) : 0;
  const totaalBehoefte = koopsom + meerwerk + ob + notaris + tax + advies + nhg + bouw + dubbel;
  const totaalMiddelen = maxLoan + num(state.spaargeld) + num(state.schenking) + num(state.overwaarde);
  return {
    koopsom, meerwerk, ob, notaris, tax, advies, nhg, bouw, dubbel,
    totaalBehoefte, totaalMiddelen,
    saldo: totaalMiddelen - totaalBehoefte,
    isNieuwbouw,
  };
}
