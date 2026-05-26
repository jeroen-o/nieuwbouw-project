import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  isFilled,
  num,
  fmtCur,
  ageFrom,
  aowDatum,
  calcMaxLoan,
  calcPct,
  sectionComplete,
  calcBegroting,
} from './dossierEngine';
import { IblUpload, IblResultCard, IblDetailModal } from './IblIntegration';
import { fmtEur } from './iblEngine';

// ============================================================
// CONSTANTS
// ============================================================

const INITIAL_STATE = {
  // Aanvrager 1
  a1Voornaam: '', a1Tussenvoegsel: '', a1Achternaam: '', a1Geboorte: '', a1Email: '',
  a1Postcode: '', a1Huisnr: '', a1Toevoeging: '', a1Straat: '', a1Plaats: '', a1Telefoon: '',
  // Partner-vraag
  samen: null,
  // Aanvrager 2
  a2Voornaam: '', a2Tussenvoegsel: '', a2Achternaam: '', a2Geboorte: '', a2Email: '',
  a2Postcode: '', a2Huisnr: '', a2Toevoeging: '', a2Straat: '', a2Plaats: '', a2Telefoon: '',
  // Historie
  h1Gehad: null, h1Status: null, h1Hoofdsom: '', h1Rest: '', h1Startdatum: '',
  h2Gehad: null, h2Status: null, h2Hoofdsom: '', h2Rest: '', h2Startdatum: '',
  // Woning
  koopsom: '', meerwerk: '', energielabel: '', oplevering: '', bouwperiode: '',
  aankoopType: null, huidigeWonen: '',
  // Inkomen
  brutoA1: '', contractA1: '',
  brutoA2: '', contractA2: '',
  pensioen1: '', pensioen2: '',
  // Eigen middelen
  spaargeld: '', schenking: '0', overwaarde: '0',
  // Verplichtingen
  studie1Heeft: null, studie1Hoofdsom: '', studie1Rest: '',
  studie2Heeft: null, studie2Hoofdsom: '', studie2Rest: '',
  heeftLening: null, leningBedrag: '', leningMaand: '',
  heeftBkr: null, bkrLimit: '',
  heeftLease: null, leaseMaand: '',
  heeftAlimentatie: null, alimPartner: '', alimKind: '',
  bkrCodering: null,
};

const SECTION_ORDER = ['a1', 'partner', 'a2', 'historie1', 'historie2', 'woning', 'inkomen1', 'inkomen2', 'geld', 'verplichtingen'];

const ENERGY_OPTIONS = [
  { v: '', l: 'Selecteer…' },
  { v: 'A++++', l: 'A++++ (NOM / nul-op-de-meter)' },
  { v: 'A+++', l: 'A+++' }, { v: 'A++', l: 'A++' },
  { v: 'A+', l: 'A+' }, { v: 'A', l: 'A' },
  { v: 'B', l: 'B of lager' },
];

const CONTRACT_OPTIONS = [
  { v: '', l: 'Selecteer…' },
  { v: 'vast', l: 'Vast contract' },
  { v: 'tijdelijk-verklaring', l: 'Tijdelijk + intentieverklaring' },
  { v: 'tijdelijk', l: 'Tijdelijk zonder verklaring' },
  { v: 'zzp', l: 'ZZP / ondernemer' },
  { v: 'dga', l: 'DGA / eigen BV' },
  { v: 'pensioen', l: 'Gepensioneerd / uitkering' },
];

const HUIDIG_WONEN_OPTIONS = [
  { v: '', l: 'Selecteer…' },
  { v: 'huur', l: 'Huurwoning' },
  { v: 'koop', l: 'Eigen koopwoning' },
  { v: 'ouders', l: 'Bij ouders / familie' },
  { v: 'anders', l: 'Anders' },
];

// ============================================================
// PDOK address lookup
// ============================================================

async function lookupAddress(postcode, huisnummer) {
  const pc = (postcode || '').replace(/\s/g, '').toUpperCase();
  if (!/^\d{4}[A-Z]{2}$/.test(pc) || !huisnummer) return null;
  try {
    const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=postcode:${pc}+AND+huisnummer:${huisnummer}&fl=weergavenaam,straatnaam,woonplaatsnaam&rows=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const doc = json.response && json.response.docs && json.response.docs[0];
    if (!doc) return null;
    return { straat: doc.straatnaam || '', plaats: doc.woonplaatsnaam || '' };
  } catch (e) {
    return null;
  }
}

// ============================================================
// REUSABLE UI COMPONENTS
// ============================================================

function Section({ id, num, title, sub, isOpen, isDone, onToggle, hidden, children }) {
  if (hidden) return null;
  return (
    <section className={`section ${isOpen ? 'open' : ''} ${isDone ? 'done' : ''}`} data-id={id}>
      <button className="section-head" type="button" onClick={onToggle}>
        <div className="section-head-left">
          <div className="section-badge">
            <span className="badge-num">{num}</span>
          </div>
          <div>
            <div className="section-title">{title}</div>
            <div className="section-sub">{sub}</div>
          </div>
        </div>
        <div className="section-head-right">
          <span className="section-status">ingevuld</span>
          <svg className="section-chevron" width="20" height="20" viewBox="0 0 20 20">
            <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
        </div>
      </button>
      <div className="section-body">{children}</div>
    </section>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <div className={`field ${className}`}>
      <label>{label}</label>
      <div className="field-input">{children}</div>
    </div>
  );
}

function FieldEur({ label, value, onChange, placeholder, className = '' }) {
  // Format with thousand separators on display
  const display = value === '' || value === null || value === undefined
    ? ''
    : new Intl.NumberFormat('nl-NL').format(num(value));
  return (
    <div className={`field ${className}`}>
      <label>{label}</label>
      <div className="field-input">
        <span className="field-prefix">€</span>
        <input
          type="text"
          inputMode="numeric"
          className="has-prefix"
          value={display}
          placeholder={placeholder}
          onChange={(e) => onChange(String(num(e.target.value) || ''))}
        />
      </div>
    </div>
  );
}

function ChoiceGroup({ value, options, onChange }) {
  return (
    <div className="choices">
      {options.map((opt) => (
        <button
          key={opt.v}
          type="button"
          className={`choice-btn ${value === opt.v ? 'active' : ''}`}
          onClick={() => onChange(opt.v)}
        >
          {opt.l}
        </button>
      ))}
    </div>
  );
}

function SectionFooter({ hint, onNext, disabled, nextLabel = 'Volgende →' }) {
  return (
    <div className="section-footer">
      <div className="section-footer-hint">{hint}</div>
      <button className="btn-primary" disabled={disabled} onClick={onNext}>
        {nextLabel}
      </button>
    </div>
  );
}

function AgeInfo({ geboorte }) {
  if (!isFilled(geboorte)) return null;
  const age = ageFrom(geboorte);
  if (age <= 0 || age > 120) return null;
  const aow = aowDatum(geboorte);
  const now = new Date();
  let tekst;
  if (!aow) {
    tekst = <span><strong>{age} jaar</strong> · reeds AOW-gerechtigd</span>;
  } else if (now >= aow.datum) {
    tekst = (
      <span>
        <strong>{age} jaar</strong> · reeds AOW-gerechtigd sinds{' '}
        {aow.datum.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
      </span>
    );
  } else {
    const aowStr = aow.datum.toLocaleDateString('nl-NL', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const leeftStr = aow.maanden > 0 ? `${aow.jaren} jaar en ${aow.maanden} maanden` : `${aow.jaren} jaar`;
    const prefix = aow.officieel ? 'AOW-leeftijd' : 'Verwachte AOW-leeftijd';
    tekst = (
      <span>
        <strong>{age} jaar</strong> · {prefix}: {leeftStr} ({aowStr})
      </span>
    );
  }
  return <div className="age-info show">📅 {tekst}</div>;
}

function AdresResult({ straat, plaats, postcode, huisnr, toevoeging, loading, error }) {
  if (loading) {
    return (
      <div className="adres-result loading show">
        <div className="spinner"></div>Adres opzoeken…
      </div>
    );
  }
  if (error) {
    return (
      <div className="adres-result error show">⚠ Adres niet gevonden — controleer postcode en huisnummer</div>
    );
  }
  if (straat && plaats) {
    return (
      <div className="adres-result show">
        ✓ <span><strong>{straat} {huisnr}{toevoeging ? toevoeging : ''}</strong>, {postcode} {plaats}</span>
      </div>
    );
  }
  return null;
}

// ============================================================
// MAIN APP
// ============================================================

export default function App() {
  const [state, setState] = useState(INITIAL_STATE);
  const [openSection, setOpenSection] = useState('a1');
  const [showResult, setShowResult] = useState(false);

  // Intake flow: gebruiker kiest digitaal vs handmatig vóór de rest
  // 'choice' | 'digital-samen' | 'digital-uploads' | 'digital-review' | 'sections'
  const [intakeMode, setIntakeMode] = useState('choice');

  // IBL data per aanvrager
  const [ibl1, setIbl1] = useState(null); // { parsed, resultaat }
  const [ibl2, setIbl2] = useState(null);
  const [iblModalData, setIblModalData] = useState(null); // {parsed, resultaat} of null

  // Inkomen tabs: 'ibl' (PDF) of 'handmatig'
  const [inkomenMode1, setInkomenMode1] = useState('ibl');
  const [inkomenMode2, setInkomenMode2] = useState('ibl');

  // Address lookup state
  const [adresLoading1, setAdresLoading1] = useState(false);
  const [adresError1, setAdresError1] = useState(false);
  const [adresLoading2, setAdresLoading2] = useState(false);
  const [adresError2, setAdresError2] = useState(false);

  const update = useCallback((patch) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const setField = useCallback((key, value) => {
    setState((s) => ({ ...s, [key]: value }));
  }, []);

  // === BEWAAR / UPLOAD DOSSIER ===
  const fileInputRef = useRef(null);

  const handleSaveDossier = useCallback(() => {
    const payload = {
      _meta: {
        app: 'dossiercompleet-ibl',
        version: 1,
        savedAt: new Date().toISOString(),
      },
      state,
      intakeMode,
      inkomenMode1,
      inkomenMode2,
      ibl1,
      ibl2,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const naam = (state.a1Achternaam || 'dossier')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'dossier';
    const datum = new Date().toISOString().slice(0, 10);
    a.download = `dossier-${naam}-${datum}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [state, intakeMode, inkomenMode1, inkomenMode2, ibl1, ibl2]);

  const handleUploadDossier = useCallback((e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || data._meta?.app !== 'dossiercompleet-ibl') {
          throw new Error('Dit lijkt geen geldig dossier-bestand.');
        }
        if (data.state) setState({ ...INITIAL_STATE, ...data.state });
        if (data.intakeMode) setIntakeMode(data.intakeMode);
        if (data.inkomenMode1) setInkomenMode1(data.inkomenMode1);
        if (data.inkomenMode2) setInkomenMode2(data.inkomenMode2);
        if (data.ibl1) setIbl1(data.ibl1);
        if (data.ibl2) setIbl2(data.ibl2);
        // Spring naar de sectie-flow zodat alle ingevulde data zichtbaar is
        if (data.intakeMode !== 'choice') {
          setIntakeMode('sections');
        }
        alert('Dossier geladen ✓');
      } catch (err) {
        alert('Kon dossier niet laden: ' + (err.message || 'onbekende fout'));
      }
    };
    reader.readAsText(file);
    // Reset zodat hetzelfde bestand twee keer kan worden geladen
    e.target.value = '';
  }, []);

  const triggerUpload = useCallback(() => {
    if (fileInputRef.current) fileInputRef.current.click();
  }, []);

  // Auto-load address when postcode + huisnr are filled
  useEffect(() => {
    if (!state.a1Postcode || !state.a1Huisnr) return;
    let cancelled = false;
    setAdresLoading1(true);
    setAdresError1(false);
    lookupAddress(state.a1Postcode, state.a1Huisnr).then((res) => {
      if (cancelled) return;
      setAdresLoading1(false);
      if (res) {
        setState((s) => ({ ...s, a1Straat: res.straat, a1Plaats: res.plaats }));
      } else {
        setAdresError1(true);
        setState((s) => ({ ...s, a1Straat: '', a1Plaats: '' }));
      }
    });
    return () => { cancelled = true; };
  }, [state.a1Postcode, state.a1Huisnr]);

  useEffect(() => {
    if (state.samen !== 'ja' || !state.a2Postcode || !state.a2Huisnr) return;
    let cancelled = false;
    setAdresLoading2(true);
    setAdresError2(false);
    lookupAddress(state.a2Postcode, state.a2Huisnr).then((res) => {
      if (cancelled) return;
      setAdresLoading2(false);
      if (res) {
        setState((s) => ({ ...s, a2Straat: res.straat, a2Plaats: res.plaats }));
      } else {
        setAdresError2(true);
        setState((s) => ({ ...s, a2Straat: '', a2Plaats: '' }));
      }
    });
    return () => { cancelled = true; };
  }, [state.a2Postcode, state.a2Huisnr, state.samen]);

  // Compute progress
  const pct = useMemo(() => calcPct(state), [state]);
  const maxLoan = useMemo(() => calcMaxLoan(state), [state]);
  const begroting = useMemo(() => calcBegroting(state, maxLoan), [state, maxLoan]);

  const visibleSections = useMemo(() => {
    return SECTION_ORDER.filter((id) => {
      if (state.samen !== 'ja' && (id === 'a2' || id === 'historie2' || id === 'inkomen2')) return false;
      return true;
    });
  }, [state.samen]);

  const stepsDone = visibleSections.filter((id) => sectionComplete(id, state)).length;
  const totalSteps = visibleSections.length;

  // Section navigation: open next section
  const openNext = (currentId) => {
    const idx = visibleSections.indexOf(currentId);
    if (idx >= 0 && idx + 1 < visibleSections.length) {
      setOpenSection(visibleSections[idx + 1]);
      // smooth scroll to next
      setTimeout(() => {
        const el = document.querySelector(`[data-id="${visibleSections[idx + 1]}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else {
      setShowResult(true);
      setTimeout(() => {
        const el = document.getElementById('result-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const toggleSection = (id) => {
    setOpenSection(openSection === id ? null : id);
  };

  // IBL upload handlers
  const handleIblParsed1 = ({ iblData, autoFill }) => {
    setIbl1(iblData);
    update(autoFill);
  };
  const handleIblParsed2 = ({ iblData, autoFill }) => {
    setIbl2(iblData);
    update(autoFill);
  };
  const removeIbl1 = () => {
    setIbl1(null);
    update({ brutoA1: '', contractA1: '' });
  };
  const removeIbl2 = () => {
    setIbl2(null);
    update({ brutoA2: '', contractA2: '' });
  };

  return (
    <>
      {/* Progress bar */}
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${(stepsDone / totalSteps) * 100}%` }}></div>
      </div>

      {/* Header */}
      <header className="header">
        <div className="container header-inner">
          <div className="brand">
            <div className="brand-logo">
              <div className="brand-dot"></div>
            </div>
            <div>
              <div className="brand-name">Dossier<span>compleet</span> + IBL</div>
              <div className="brand-sub">HYPOTHEEK · TOETSINKOMEN · NIBUD 2026</div>
            </div>
          </div>
          <div className="pct-widget">
            <div className="pct-label-wrap">
              <div className="pct-kicker">Compleet</div>
              <div className="pct-msg">
                {pct >= 85 ? 'Uitstekende kans' : pct >= 65 ? 'Sterke kans' : pct >= 40 ? 'Op de goede weg' : 'Vul meer in'}
              </div>
              <div className="pct-progress">{stepsDone} van {totalSteps} stappen</div>
            </div>
            <div className="pct-ring-wrap">
              <svg width="64" height="64">
                <circle className="ring-bg" cx="32" cy="32" r="26"></circle>
                <circle
                  className="ring-fg"
                  cx="32" cy="32" r="26"
                  style={{ strokeDashoffset: 163.4 - (163.4 * pct) / 100 }}
                ></circle>
              </svg>
              <div className="pct-num">
                <span className="num">{pct}</span>
                <span className="pct-suffix">%</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Dossier acties (bewaren / uploaden / printen) */}
      <div className="dossier-toolbar">
        <div className="container dossier-toolbar-inner">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleUploadDossier}
            style={{ display: 'none' }}
            aria-hidden="true"
          />
          <button
            type="button"
            className="dossier-action"
            onClick={triggerUpload}
            title="Een eerder bewaard dossier-bestand inladen"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Upload dossier
          </button>
          <button
            type="button"
            className="dossier-action"
            onClick={handleSaveDossier}
            title="Sla het huidige dossier op als bestand"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Bewaar dossier
          </button>
          {showResult && (
            <button
              type="button"
              className="dossier-action dossier-action-print"
              onClick={() => window.print()}
              title="Druk het rapport af of bewaar als PDF"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
              </svg>
              Print rapport
            </button>
          )}
        </div>
      </div>

      {/* === INTAKE: keuze digitaal vs handmatig vóór de rest === */}
      {intakeMode !== 'sections' && (
        <IntakeFlow
          intakeMode={intakeMode}
          setIntakeMode={setIntakeMode}
          state={state}
          setField={setField}
          ibl1={ibl1}
          ibl2={ibl2}
          onIbl1Parsed={handleIblParsed1}
          onIbl2Parsed={handleIblParsed2}
          removeIbl1={removeIbl1}
          removeIbl2={removeIbl2}
          onComplete={() => {
            setIntakeMode('sections');
            setOpenSection('a1');
            setTimeout(() => {
              const el = document.querySelector('[data-id="a1"]');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
          }}
        />
      )}

      {/* === DOSSIER (existing 10 secties) — enkel zichtbaar na intake === */}
      {intakeMode === 'sections' && <>
      {/* Hero */}
      <div className="container hero">
        <h1>
          Hoe groot is de kans dat <em>jouw droomwoning</em> daadwerkelijk van jou wordt?
        </h1>
        <p>
          Vul je dossier in én upload je UWV verzekeringsbericht voor een nauwkeurige berekening
          conform de officiële IBL-rekenregels. Hoe completer het dossier, hoe preciezer we jullie
          kans én maximale hypotheek bepalen.
        </p>
      </div>

      {/* Sections */}
      <main className="container sections">
        {/* 01 - Aanvrager 1 */}
        <Section
          id="a1" num="01" title="Over jou" sub="Aanvrager 1 — persoonsgegevens"
          isOpen={openSection === 'a1'} isDone={sectionComplete('a1', state)}
          onToggle={() => toggleSection('a1')}
        >
          <div className="grid grid-3">
            <Field label="Voornaam">
              <input value={state.a1Voornaam} onChange={(e) => setField('a1Voornaam', e.target.value)} placeholder="Anna" />
            </Field>
            <Field label="Tussenvoegsel">
              <input value={state.a1Tussenvoegsel} onChange={(e) => setField('a1Tussenvoegsel', e.target.value)} placeholder="van der" />
            </Field>
            <Field label="Achternaam">
              <input value={state.a1Achternaam} onChange={(e) => setField('a1Achternaam', e.target.value)} placeholder="Bakker" />
            </Field>
          </div>
          <div className="grid grid-2" style={{ marginTop: 16 }}>
            <div className="field">
              <label>Geboortedatum</label>
              <div className="field-input">
                <input type="date" value={state.a1Geboorte} onChange={(e) => setField('a1Geboorte', e.target.value)} />
              </div>
              <AgeInfo geboorte={state.a1Geboorte} />
            </div>
            <Field label="E-mailadres">
              <input type="email" value={state.a1Email} onChange={(e) => setField('a1Email', e.target.value)} placeholder="naam@voorbeeld.nl" />
            </Field>
          </div>
          <div className="grid grid-postcode" style={{ marginTop: 16 }}>
            <Field label="Postcode">
              <input
                value={state.a1Postcode}
                onChange={(e) => setField('a1Postcode', e.target.value.toUpperCase())}
                placeholder="1012 AB" maxLength={7} autoComplete="postal-code"
              />
            </Field>
            <Field label="Huisnummer">
              <input value={state.a1Huisnr} onChange={(e) => setField('a1Huisnr', e.target.value)} placeholder="42" inputMode="numeric" />
            </Field>
            <Field label="Toevoeging">
              <input value={state.a1Toevoeging} onChange={(e) => setField('a1Toevoeging', e.target.value)} placeholder="A" />
            </Field>
          </div>
          <AdresResult
            straat={state.a1Straat} plaats={state.a1Plaats}
            postcode={state.a1Postcode} huisnr={state.a1Huisnr} toevoeging={state.a1Toevoeging}
            loading={adresLoading1} error={adresError1}
          />
          <div className="grid" style={{ marginTop: 16 }}>
            <Field label="Telefoonnummer">
              <input type="tel" value={state.a1Telefoon} onChange={(e) => setField('a1Telefoon', e.target.value)} placeholder="06 …" />
            </Field>
          </div>
          <SectionFooter
            hint="Adres wordt automatisch opgezocht via postcode + huisnummer"
            onNext={() => openNext('a1')}
            disabled={!sectionComplete('a1', state)}
          />
        </Section>

        {/* 02 - Partner */}
        <Section
          id="partner" num="02" title="Samen kopen?" sub="Koop je de woning met een partner?"
          isOpen={openSection === 'partner'} isDone={sectionComplete('partner', state)}
          onToggle={() => toggleSection('partner')}
        >
          <div className="field">
            <ChoiceGroup
              value={state.samen}
              options={[{ v: 'ja', l: 'Ja, we kopen samen' }, { v: 'nee', l: 'Nee, ik koop alleen' }]}
              onChange={(v) => setField('samen', v)}
            />
          </div>
          <SectionFooter
            hint="Hoe completer je dossier, hoe groter je kans op de woning"
            onNext={() => openNext('partner')}
            disabled={!sectionComplete('partner', state)}
          />
        </Section>

        {/* 03 - Aanvrager 2 */}
        <Section
          id="a2" num="03" title="Over aanvrager 2" sub="Aanvrager 2 — persoonsgegevens"
          isOpen={openSection === 'a2'} isDone={sectionComplete('a2', state)}
          onToggle={() => toggleSection('a2')}
          hidden={state.samen !== 'ja'}
        >
          <button
            className="btn-copy"
            type="button"
            disabled={!state.a1Postcode || !state.a1Huisnr}
            onClick={() => update({
              a2Postcode: state.a1Postcode,
              a2Huisnr: state.a1Huisnr,
              a2Toevoeging: state.a1Toevoeging,
            })}
          >
            ↩ {state.a1Postcode && state.a1Huisnr ? 'Zelfde adres als aanvrager 1' : 'Vul eerst adres aanvrager 1 in'}
          </button>
          <div className="grid grid-3">
            <Field label="Voornaam">
              <input value={state.a2Voornaam} onChange={(e) => setField('a2Voornaam', e.target.value)} placeholder="Lars" />
            </Field>
            <Field label="Tussenvoegsel">
              <input value={state.a2Tussenvoegsel} onChange={(e) => setField('a2Tussenvoegsel', e.target.value)} />
            </Field>
            <Field label="Achternaam">
              <input value={state.a2Achternaam} onChange={(e) => setField('a2Achternaam', e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-2" style={{ marginTop: 16 }}>
            <div className="field">
              <label>Geboortedatum</label>
              <div className="field-input">
                <input type="date" value={state.a2Geboorte} onChange={(e) => setField('a2Geboorte', e.target.value)} />
              </div>
              <AgeInfo geboorte={state.a2Geboorte} />
            </div>
            <Field label="E-mailadres">
              <input type="email" value={state.a2Email} onChange={(e) => setField('a2Email', e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-postcode" style={{ marginTop: 16 }}>
            <Field label="Postcode">
              <input
                value={state.a2Postcode}
                onChange={(e) => setField('a2Postcode', e.target.value.toUpperCase())}
                maxLength={7} placeholder="1012 AB"
              />
            </Field>
            <Field label="Huisnummer">
              <input value={state.a2Huisnr} onChange={(e) => setField('a2Huisnr', e.target.value)} inputMode="numeric" />
            </Field>
            <Field label="Toevoeging">
              <input value={state.a2Toevoeging} onChange={(e) => setField('a2Toevoeging', e.target.value)} />
            </Field>
          </div>
          <AdresResult
            straat={state.a2Straat} plaats={state.a2Plaats}
            postcode={state.a2Postcode} huisnr={state.a2Huisnr} toevoeging={state.a2Toevoeging}
            loading={adresLoading2} error={adresError2}
          />
          <div className="grid" style={{ marginTop: 16 }}>
            <Field label="Telefoonnummer">
              <input type="tel" value={state.a2Telefoon} onChange={(e) => setField('a2Telefoon', e.target.value)} />
            </Field>
          </div>
          <SectionFooter
            hint="Tip: gebruik de snelkoppeling bovenin voor een gedeeld adres"
            onNext={() => openNext('a2')}
            disabled={!sectionComplete('a2', state)}
          />
        </Section>

        {/* 04 - Historie 1 */}
        <Section
          id="historie1" num="04" title="Hypotheek historie"
          sub="Heb je ooit eerder een hypotheek gehad?"
          isOpen={openSection === 'historie1'} isDone={sectionComplete('historie1', state)}
          onToggle={() => toggleSection('historie1')}
        >
          <div className="field">
            <label>Heb je ooit eerder een hypotheek gehad?</label>
            <ChoiceGroup
              value={state.h1Gehad}
              options={[{ v: 'ja', l: 'Ja, eerder gehad' }, { v: 'nee', l: 'Nee, dit wordt de eerste' }]}
              onChange={(v) => setField('h1Gehad', v)}
            />
          </div>
          {state.h1Gehad === 'ja' && (
            <div className="subgroup">
              <div className="subgroup-title">Vertel ons er iets meer over</div>
              <div className="field">
                <label>Status van die hypotheek</label>
                <ChoiceGroup
                  value={state.h1Status}
                  options={[{ v: 'lopend', l: 'Loopt nog' }, { v: 'afgelost', l: 'Afgelost' }]}
                  onChange={(v) => setField('h1Status', v)}
                />
              </div>
              {state.h1Status === 'lopend' && (
                <div className="grid grid-2" style={{ marginTop: 16 }}>
                  <FieldEur label="Oorspronkelijke hoofdsom" value={state.h1Hoofdsom} onChange={(v) => setField('h1Hoofdsom', v)} placeholder="285.000" />
                  <FieldEur label="Restant hoofdsom" value={state.h1Rest} onChange={(v) => setField('h1Rest', v)} placeholder="215.000" />
                  <Field label="Ingangsdatum hypotheek" className="col-2">
                    <input type="date" value={state.h1Startdatum} onChange={(e) => setField('h1Startdatum', e.target.value)} />
                  </Field>
                </div>
              )}
            </div>
          )}
          <SectionFooter
            hint="Hoe completer je dossier, hoe groter je kans op de woning"
            onNext={() => openNext('historie1')}
            disabled={!sectionComplete('historie1', state)}
          />
        </Section>

        {/* 05 - Historie 2 */}
        <Section
          id="historie2" num="05" title="Hypotheek historie aanvrager 2"
          sub="En aanvrager 2?"
          isOpen={openSection === 'historie2'} isDone={sectionComplete('historie2', state)}
          onToggle={() => toggleSection('historie2')}
          hidden={state.samen !== 'ja'}
        >
          <button
            className="btn-copy"
            type="button"
            disabled={!isFilled(state.h1Gehad)}
            onClick={() => update({
              h2Gehad: state.h1Gehad, h2Status: state.h1Status,
              h2Hoofdsom: state.h1Hoofdsom, h2Rest: state.h1Rest,
              h2Startdatum: state.h1Startdatum,
            })}
          >
            ↩ {isFilled(state.h1Gehad) ? 'Zelfde historie als aanvrager 1' : 'Vul eerst historie aanvrager 1 in'}
          </button>
          <div className="field">
            <label>Heeft aanvrager 2 ooit een hypotheek gehad?</label>
            <ChoiceGroup
              value={state.h2Gehad}
              options={[{ v: 'ja', l: 'Ja, eerder gehad' }, { v: 'nee', l: 'Nee' }]}
              onChange={(v) => setField('h2Gehad', v)}
            />
          </div>
          {state.h2Gehad === 'ja' && (
            <div className="subgroup">
              <div className="subgroup-title">Meer informatie over deze hypotheek</div>
              <div className="field">
                <label>Status van die hypotheek</label>
                <ChoiceGroup
                  value={state.h2Status}
                  options={[{ v: 'lopend', l: 'Loopt nog' }, { v: 'afgelost', l: 'Afgelost' }]}
                  onChange={(v) => setField('h2Status', v)}
                />
              </div>
              {state.h2Status === 'lopend' && (
                <div className="grid grid-2" style={{ marginTop: 16 }}>
                  <FieldEur label="Oorspronkelijke hoofdsom" value={state.h2Hoofdsom} onChange={(v) => setField('h2Hoofdsom', v)} placeholder="285.000" />
                  <FieldEur label="Restant hoofdsom" value={state.h2Rest} onChange={(v) => setField('h2Rest', v)} placeholder="215.000" />
                  <Field label="Ingangsdatum hypotheek" className="col-2">
                    <input type="date" value={state.h2Startdatum} onChange={(e) => setField('h2Startdatum', e.target.value)} />
                  </Field>
                </div>
              )}
            </div>
          )}
          <SectionFooter
            hint="Gedeelde historie? Gebruik de snelkoppeling bovenin"
            onNext={() => openNext('historie2')}
            disabled={!sectionComplete('historie2', state)}
          />
        </Section>

        {/* 06 - Woning */}
        <Section
          id="woning" num="06" title="De aan te kopen woning" sub="Details van het project"
          isOpen={openSection === 'woning'} isDone={sectionComplete('woning', state)}
          onToggle={() => toggleSection('woning')}
        >
          <div className="grid grid-2">
            <div className="field col-2">
              <label>Type aankoop</label>
              <ChoiceGroup
                value={state.aankoopType}
                options={[
                  { v: 'nieuwbouw', l: 'Aankoop nieuwbouw' },
                  { v: 'bestaand', l: 'Aankoop bestaande bouw' },
                ]}
                onChange={(v) => setField('aankoopType', v)}
              />
            </div>
            <FieldEur label="Koop-/aanneemsom" value={state.koopsom} onChange={(v) => setField('koopsom', v)} placeholder="450.000" />
            <FieldEur label="Meerwerk (geschat)" value={state.meerwerk} onChange={(v) => setField('meerwerk', v)} placeholder="25.000" />
            <Field label="Energielabel">
              <select value={state.energielabel} onChange={(e) => setField('energielabel', e.target.value)}>
                {ENERGY_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </Field>
            <Field label="Verwachte oplevering">
              <input type="date" value={state.oplevering} onChange={(e) => setField('oplevering', e.target.value)} />
            </Field>
            {state.aankoopType === 'nieuwbouw' && (
              <Field label="Bouwperiode in maanden">
                <input type="number" value={state.bouwperiode} onChange={(e) => setField('bouwperiode', e.target.value)} placeholder="18" min="0" max="36" />
              </Field>
            )}
            <Field label="Huidige woonsituatie">
              <select value={state.huidigeWonen} onChange={(e) => setField('huidigeWonen', e.target.value)}>
                {HUIDIG_WONEN_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </Field>
          </div>
          <SectionFooter
            hint="Hoe completer je dossier, hoe groter je kans op de woning"
            onNext={() => openNext('woning')}
            disabled={!sectionComplete('woning', state)}
          />
        </Section>

        {/* 07 - Inkomen 1 */}
        <Section
          id="inkomen1" num="07" title="Inkomen aanvrager 1"
          sub={state.a1Voornaam ? `Financiële positie van ${state.a1Voornaam}` : 'Financiële positie van jou'}
          isOpen={openSection === 'inkomen1'} isDone={sectionComplete('inkomen1', state)}
          onToggle={() => toggleSection('inkomen1')}
        >
          <div className="inkomen-tabs">
            <button
              type="button"
              className={`inkomen-tab ${inkomenMode1 === 'ibl' ? 'active' : ''}`}
              onClick={() => setInkomenMode1('ibl')}
            >
              📄 Met UWV bericht
            </button>
            <button
              type="button"
              className={`inkomen-tab ${inkomenMode1 === 'handmatig' ? 'active' : ''}`}
              onClick={() => setInkomenMode1('handmatig')}
            >
              ✏ Handmatig invullen
            </button>
          </div>

          {inkomenMode1 === 'ibl' && !ibl1 && (
            <IblUpload
              aanvragerLabel={state.a1Voornaam || 'aanvrager 1'}
              prefix="a1"
              onParsed={handleIblParsed1}
              eigenBijdrage={0}
            />
          )}
          {ibl1 && (
            <IblResultCard
              iblData={ibl1}
              onShowDetail={() => setIblModalData(ibl1)}
              onRemove={removeIbl1}
              onReplaceClick={removeIbl1}
            />
          )}

          <div className="grid grid-2">
            <FieldEur
              label="Bruto jaarinkomen"
              value={state.brutoA1}
              onChange={(v) => setField('brutoA1', v)}
              placeholder="52.000"
            />
            <Field label="Type dienstverband">
              <select value={state.contractA1} onChange={(e) => setField('contractA1', e.target.value)}>
                {CONTRACT_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </Field>
            {ageFrom(state.a1Geboorte) >= 55 && (
              <FieldEur
                label="Verwacht bruto jaarlijks pensioeninkomen"
                value={state.pensioen1}
                onChange={(v) => setField('pensioen1', v)}
                placeholder="0 als nog niet"
                className="col-2"
              />
            )}
          </div>
          <SectionFooter
            hint="Hoe completer je dossier, hoe groter je kans op de woning"
            onNext={() => openNext('inkomen1')}
            disabled={!sectionComplete('inkomen1', state)}
          />
        </Section>

        {/* 08 - Inkomen 2 */}
        <Section
          id="inkomen2" num="08" title="Inkomen aanvrager 2"
          sub={state.a2Voornaam ? `Financiële positie van ${state.a2Voornaam}` : 'Financiële positie aanvrager 2'}
          isOpen={openSection === 'inkomen2'} isDone={sectionComplete('inkomen2', state)}
          onToggle={() => toggleSection('inkomen2')}
          hidden={state.samen !== 'ja'}
        >
          <div className="inkomen-tabs">
            <button
              type="button"
              className={`inkomen-tab ${inkomenMode2 === 'ibl' ? 'active' : ''}`}
              onClick={() => setInkomenMode2('ibl')}
            >
              📄 Met UWV bericht
            </button>
            <button
              type="button"
              className={`inkomen-tab ${inkomenMode2 === 'handmatig' ? 'active' : ''}`}
              onClick={() => setInkomenMode2('handmatig')}
            >
              ✏ Handmatig invullen
            </button>
          </div>

          {inkomenMode2 === 'ibl' && !ibl2 && (
            <IblUpload
              aanvragerLabel={state.a2Voornaam || 'aanvrager 2'}
              prefix="a2"
              onParsed={handleIblParsed2}
              eigenBijdrage={0}
            />
          )}
          {ibl2 && (
            <IblResultCard
              iblData={ibl2}
              onShowDetail={() => setIblModalData(ibl2)}
              onRemove={removeIbl2}
              onReplaceClick={removeIbl2}
            />
          )}

          <div className="grid grid-2">
            <FieldEur
              label="Bruto jaarinkomen"
              value={state.brutoA2}
              onChange={(v) => setField('brutoA2', v)}
              placeholder="42.000"
            />
            <Field label="Type dienstverband">
              <select value={state.contractA2} onChange={(e) => setField('contractA2', e.target.value)}>
                {CONTRACT_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </Field>
            {ageFrom(state.a2Geboorte) >= 55 && (
              <FieldEur
                label="Verwacht bruto jaarlijks pensioeninkomen"
                value={state.pensioen2}
                onChange={(v) => setField('pensioen2', v)}
                placeholder="0 als nog niet"
                className="col-2"
              />
            )}
          </div>
          <SectionFooter
            hint="Hoe completer je dossier, hoe groter je kans op de woning"
            onNext={() => openNext('inkomen2')}
            disabled={!sectionComplete('inkomen2', state)}
          />
        </Section>

        {/* 09 - Eigen middelen */}
        <Section
          id="geld" num="09" title="Eigen middelen" sub="Spaargeld, schenking, overwaarde"
          isOpen={openSection === 'geld'} isDone={sectionComplete('geld', state)}
          onToggle={() => toggleSection('geld')}
        >
          <div className="grid grid-2">
            <FieldEur label="Spaargeld voor kosten koper" value={state.spaargeld} onChange={(v) => setField('spaargeld', v)} placeholder="15.000" />
            <FieldEur label="Schenking van familie" value={state.schenking} onChange={(v) => setField('schenking', v)} placeholder="0" />
            {state.huidigeWonen === 'koop' && (
              <FieldEur label="Verwachte overwaarde huidige woning" value={state.overwaarde} onChange={(v) => setField('overwaarde', v)} placeholder="0" className="col-2" />
            )}
          </div>
          <div className="info-box neutral">
            Bij nieuwbouw zijn de kosten koper lager dan bij bestaande bouw — reken bij nieuwbouw op
            ~3% van de koopsom, bij bestaande bouw op ~5–6%.
          </div>
          <SectionFooter
            hint="Hoe completer je dossier, hoe groter je kans op de woning"
            onNext={() => openNext('geld')}
            disabled={!sectionComplete('geld', state)}
          />
        </Section>

        {/* 10 - Verplichtingen */}
        <Section
          id="verplichtingen" num="10" title="Overige verplichtingen"
          sub="Studieschuld, kredieten, alimentatie, BKR"
          isOpen={openSection === 'verplichtingen'} isDone={sectionComplete('verplichtingen', state)}
          onToggle={() => toggleSection('verplichtingen')}
        >
          {/* STUDIESCHULD A1 */}
          <div className="field" style={{ marginBottom: 20 }}>
            <label>{state.a1Voornaam ? `Heeft ${state.a1Voornaam} een studieschuld?` : 'Heb je een studieschuld?'}</label>
            <ChoiceGroup
              value={state.studie1Heeft}
              options={[{ v: 'nee', l: 'Nee' }, { v: 'ja', l: 'Ja' }]}
              onChange={(v) => setField('studie1Heeft', v)}
            />
          </div>
          {state.studie1Heeft === 'ja' && (
            <div className="subgroup">
              <div className="subgroup-title">Gegevens studieschuld aanvrager 1</div>
              <div className="grid grid-2">
                <FieldEur label="Oorspronkelijke hoofdsom" value={state.studie1Hoofdsom} onChange={(v) => setField('studie1Hoofdsom', v)} placeholder="28.000" />
                <FieldEur label="Huidige restschuld" value={state.studie1Rest} onChange={(v) => setField('studie1Rest', v)} placeholder="22.000" />
              </div>
            </div>
          )}

          {/* STUDIESCHULD A2 */}
          {state.samen === 'ja' && (
            <>
              <div className="field" style={{ margin: '24px 0 20px' }}>
                <label>{state.a2Voornaam ? `Heeft ${state.a2Voornaam} een studieschuld?` : 'Heeft aanvrager 2 een studieschuld?'}</label>
                <ChoiceGroup
                  value={state.studie2Heeft}
                  options={[{ v: 'nee', l: 'Nee' }, { v: 'ja', l: 'Ja' }]}
                  onChange={(v) => setField('studie2Heeft', v)}
                />
              </div>
              {state.studie2Heeft === 'ja' && (
                <div className="subgroup">
                  <div className="subgroup-title">Gegevens studieschuld aanvrager 2</div>
                  <div className="grid grid-2">
                    <FieldEur label="Oorspronkelijke hoofdsom" value={state.studie2Hoofdsom} onChange={(v) => setField('studie2Hoofdsom', v)} placeholder="28.000" />
                    <FieldEur label="Huidige restschuld" value={state.studie2Rest} onChange={(v) => setField('studie2Rest', v)} placeholder="22.000" />
                  </div>
                </div>
              )}
            </>
          )}

          {/* LENINGEN */}
          {isFilled(state.studie1Heeft) && (state.samen !== 'ja' || isFilled(state.studie2Heeft)) && (
            <>
              <div className="field" style={{ margin: '24px 0 20px' }}>
                <label>Lopende kredieten of persoonlijke leningen?</label>
                <ChoiceGroup
                  value={state.heeftLening}
                  options={[{ v: 'nee', l: 'Geen leningen' }, { v: 'ja', l: 'Ja, ik heb een lening' }]}
                  onChange={(v) => setField('heeftLening', v)}
                />
              </div>
              {state.heeftLening === 'ja' && (
                <div className="subgroup">
                  <div className="subgroup-title">Vertel ons over de lening(en)</div>
                  <div className="grid grid-2">
                    <FieldEur label="Openstaand bedrag totaal" value={state.leningBedrag} onChange={(v) => setField('leningBedrag', v)} placeholder="5.000" />
                    <FieldEur label="Maandlast" value={state.leningMaand} onChange={(v) => setField('leningMaand', v)} placeholder="150" />
                  </div>
                </div>
              )}
            </>
          )}

          {/* CREDITCARD */}
          {isFilled(state.heeftLening) && (
            <>
              <div className="field" style={{ margin: '24px 0 20px' }}>
                <label>Creditcard of roodstandfaciliteit?</label>
                <ChoiceGroup
                  value={state.heeftBkr}
                  options={[{ v: 'nee', l: 'Geen' }, { v: 'ja', l: 'Ja' }]}
                  onChange={(v) => setField('heeftBkr', v)}
                />
              </div>
              {state.heeftBkr === 'ja' && (
                <div className="subgroup">
                  <FieldEur label="Totale limiet (creditcard + roodstand)" value={state.bkrLimit} onChange={(v) => setField('bkrLimit', v)} placeholder="2.500" />
                </div>
              )}
            </>
          )}

          {/* LEASE */}
          {isFilled(state.heeftBkr) && (
            <>
              <div className="field" style={{ margin: '24px 0 20px' }}>
                <label>Private lease (auto, fiets, e.d.)?</label>
                <ChoiceGroup
                  value={state.heeftLease}
                  options={[{ v: 'nee', l: 'Nee' }, { v: 'ja', l: 'Ja' }]}
                  onChange={(v) => setField('heeftLease', v)}
                />
              </div>
              {state.heeftLease === 'ja' && (
                <div className="subgroup">
                  <FieldEur label="Maandbedrag lease" value={state.leaseMaand} onChange={(v) => setField('leaseMaand', v)} placeholder="350" />
                </div>
              )}
            </>
          )}

          {/* ALIMENTATIE */}
          {isFilled(state.heeftLease) && (
            <>
              <div className="field" style={{ margin: '24px 0 20px' }}>
                <label>Betaal je alimentatie?</label>
                <ChoiceGroup
                  value={state.heeftAlimentatie}
                  options={[{ v: 'nee', l: 'Nee' }, { v: 'ja', l: 'Ja' }]}
                  onChange={(v) => setField('heeftAlimentatie', v)}
                />
              </div>
              {state.heeftAlimentatie === 'ja' && (
                <div className="subgroup">
                  <div className="grid grid-2">
                    <FieldEur label="Partneralimentatie per maand" value={state.alimPartner} onChange={(v) => setField('alimPartner', v)} placeholder="0" />
                    <FieldEur label="Kinderalimentatie per maand" value={state.alimKind} onChange={(v) => setField('alimKind', v)} placeholder="0" />
                  </div>
                </div>
              )}
            </>
          )}

          {/* BKR CODERING */}
          {isFilled(state.heeftAlimentatie) && (
            <div style={{ marginTop: 24 }}>
              <div className="field" style={{ marginBottom: 12 }}>
                <label>Heb je een BKR-codering?</label>
              </div>
              <div className="info-box neutral" style={{ marginTop: 0, marginBottom: 14 }}>
                <strong>Wat is BKR?</strong> Het Bureau Krediet Registratie registreert kredieten in
                Nederland. Bij betalingsachterstanden krijg je een codering — A (actief) of H (herstel).
                Geldverstrekkers kijken hier scherp naar.{' '}
                💡 Je kunt je registratie gratis opvragen op{' '}
                <a href="https://www.bkr.nl" target="_blank" rel="noopener noreferrer" style={{ color: '#0A2D7A', fontWeight: 500 }}>
                  www.bkr.nl
                </a>.
              </div>
              <ChoiceGroup
                value={state.bkrCodering}
                options={[
                  { v: 'nee', l: 'Nee, geen codering' },
                  { v: 'H', l: 'Ja, herstel (H)' },
                  { v: 'A', l: 'Ja, actief (A)' },
                  { v: 'weet-niet', l: 'Weet niet' },
                ]}
                onChange={(v) => setField('bkrCodering', v)}
              />
              {state.bkrCodering === 'A' && (
                <div className="info-box warning" style={{ marginTop: 14 }}>
                  ⚠ Een actieve A-codering maakt een hypotheekaanvraag vrijwel onmogelijk bij
                  reguliere geldverstrekkers. Overweeg eerst de codering te laten verwijderen.
                </div>
              )}
            </div>
          )}

          <SectionFooter
            hint="Laatste sectie — bijna klaar voor je uitslag"
            onNext={() => openNext('verplichtingen')}
            disabled={!sectionComplete('verplichtingen', state)}
            nextLabel="Toon uitslag →"
          />
        </Section>

        {/* RESULT */}
        {showResult && (
          <Result
            id="result-section"
            state={state}
            pct={pct}
            maxLoan={maxLoan}
            begroting={begroting}
            ibl1={ibl1}
            ibl2={ibl2}
          />
        )}
      </main>
      </>}

      {/* Floating max-bar (when income is filled) */}
      {intakeMode === 'sections' && maxLoan > 0 && !showResult && (
        <div className="maxbar visible">
          <div className="maxbar-label">Indicatieve max hypotheek</div>
          <div className="maxbar-value">{fmtCur(maxLoan)}</div>
        </div>
      )}

      <section className="lenders" aria-labelledby="lenders-heading">
        <div className="container">
          <div id="lenders-heading" className="lenders-eyebrow">Geldverstrekkers</div>
          <div className="lenders-grid">
            {Array.from({ length: 22 }, (_, i) => {
              const n = String(i + 1).padStart(2, '0');
              return (
                <div className="lenders-cell" key={n}>
                  <img
                    src={`${import.meta.env.BASE_URL}lenders/lender-${n}.png`}
                    alt=""
                    role="presentation"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              );
            })}
          </div>
          <p className="lenders-note">
            Dossiercompleet en haar partners toetsen uw gegevens o.a. tegen de
            acceptatiecriteria van deze geldverstrekkers. Dat doen we intern,
            zonder uw gegevens te delen met de geldverstrekkers.
          </p>
        </div>
      </section>

      <div className="footer-note">
        Dossiercompleet + IBL · indicatief instrument · geen financieel advies
      </div>

      {/* IBL detail modal */}
      <IblDetailModal iblData={iblModalData} onClose={() => setIblModalData(null)} />

      {/* Print-versie van het rapport — alleen zichtbaar bij window.print() */}
      {showResult && (
        <RapportPrint
          state={state}
          maxLoan={maxLoan}
          begroting={begroting}
          ibl1={ibl1}
          ibl2={ibl2}
        />
      )}
    </>
  );
}

// ============================================================
// RESULT
// ============================================================

function Result({ state, pct, maxLoan, begroting, ibl1, ibl2 }) {
  const tags = useMemo(() => {
    const t = [];
    if (state.samen === 'ja') t.push('Tweeverdieners');
    if ((num(state.brutoA1) + num(state.brutoA2)) > 80000) t.push('Sterk gezamenlijk inkomen');
    if (state.aankoopType === 'nieuwbouw') t.push('Nieuwbouw aankoop');
    if (['A++++', 'A+++', 'A++'].includes(state.energielabel)) t.push('Zeer energiezuinig');
    if (state.h1Gehad === 'ja' || state.h2Gehad === 'ja') t.push('Hypotheek-ervaring');
    if (state.studie1Heeft === 'nee' && (state.samen !== 'ja' || state.studie2Heeft === 'nee')) t.push('Geen studieschuld');
    if (state.bkrCodering === 'nee' && state.heeftLening === 'nee') t.push('Schoon BKR-profiel');
    if (ibl1 || ibl2) t.push('IBL-toetsinkomen berekend');
    return t;
  }, [state, ibl1, ibl2]);

  const headline = pct >= 80 ? 'Sterk profiel — een goede uitgangspositie voor jullie hypotheek.'
    : pct >= 60 ? 'Aardige basis — vul nog wat aan voor een nauwkeuriger beeld.'
    : 'Vul nog wat meer aan om een betrouwbare inschatting te krijgen.';

  return (
    <div id="result-section" className="result">
      <div className="result-max">
        <div className="result-max-label">Jullie maximale hypotheek</div>
        <div className="result-max-value">{fmtCur(maxLoan)}</div>
        <div className="result-max-sub">
          Conform NIBUD/AFM 2026. Toetsrente 5%. Inclusief aftrek van studieschuld (gebruteerd),
          kredieten, lease, alimentatie en lopende hypotheek. Energielabel-bonus en verhoging
          niet-kwetsbare groep (€17k voor alleenstaanden) toegepast.
          {(ibl1 || ibl2) && ' Inkomen berekend conform IBL Rekenregels 8.1.1.'}
        </div>
      </div>

      <div className="result-grid">
        <div>
          <div className="result-kicker">Compleet</div>
          <div className="result-pct-big">
            <span className="result-pct-num">{pct}</span>
            <span className="result-pct-suffix">%</span>
          </div>
          <p className="result-headline">{headline}</p>
        </div>
        <div>
          <div className="result-kicker">Wat weegt mee</div>
          <div className="tags-list">
            {tags.map((t, i) => (
              <span key={i} className="tag positive">{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Begroting */}
      <div className="begroting">
        <div className="begroting-title">Aankoop begroting</div>
        <div className="begroting-intro">
          Overzicht van wat jullie nodig hebben en wat er beschikbaar is.
        </div>
        <div className="begroting-grid">
          <div className="begroting-col">
            <div className="begroting-col-header">Financieringsbehoefte</div>
            <div className="begroting-row"><div className="lbl">Koop-/aanneemsom</div><div className="val">{fmtCur(begroting.koopsom)}</div></div>
            <div className="begroting-row"><div className="lbl">Meerwerk</div><div className="val">{fmtCur(begroting.meerwerk)}</div></div>
            {!begroting.isNieuwbouw && (
              <div className="begroting-row"><div className="lbl">Overdrachtsbelasting</div><div className="val">{fmtCur(begroting.ob)}</div></div>
            )}
            <div className="begroting-row"><div className="lbl">Notaris- en leveringskosten</div><div className="val">{fmtCur(begroting.notaris)}</div></div>
            {!begroting.isNieuwbouw && (
              <div className="begroting-row"><div className="lbl">Taxatiekosten</div><div className="val">{fmtCur(begroting.tax)}</div></div>
            )}
            <div className="begroting-row"><div className="lbl">Advies- en bemiddelingskosten</div><div className="val">{fmtCur(begroting.advies)}</div></div>
            <div className="begroting-row"><div className="lbl">NHG borgstellingsprovisie <small>0,4% van hypotheek</small></div><div className="val">{fmtCur(begroting.nhg)}</div></div>
            {begroting.isNieuwbouw && (
              <div className="begroting-row"><div className="lbl">Renteverlies tijdens de bouw</div><div className="val">{fmtCur(begroting.bouw)}</div></div>
            )}
            <div className="begroting-row"><div className="lbl">Reservering dubbele woonlasten</div><div className="val">{fmtCur(begroting.dubbel)}</div></div>
            <div className="begroting-row total"><div className="lbl">Totaal benodigd</div><div className="val">{fmtCur(begroting.totaalBehoefte)}</div></div>
          </div>
          <div className="begroting-col">
            <div className="begroting-col-header">Financieringsmiddelen</div>
            <div className="begroting-row"><div className="lbl">Hypotheek <small>indicatief · max toetsing 5%</small></div><div className="val">{fmtCur(maxLoan)}</div></div>
            <div className="begroting-row"><div className="lbl">Spaargeld</div><div className="val">{fmtCur(num(state.spaargeld))}</div></div>
            <div className="begroting-row"><div className="lbl">Schenking van familie</div><div className="val">{fmtCur(num(state.schenking))}</div></div>
            {state.huidigeWonen === 'koop' && (
              <div className="begroting-row"><div className="lbl">Overwaarde huidige woning</div><div className="val">{fmtCur(num(state.overwaarde))}</div></div>
            )}
            <div className="begroting-row total"><div className="lbl">Totaal beschikbaar</div><div className="val">{fmtCur(begroting.totaalMiddelen)}</div></div>
          </div>
        </div>
        <div className={`begroting-saldo ${begroting.saldo >= 0 ? 'positive' : 'negative'}`} role="status">
          <div className="saldo-icon" aria-hidden="true">
            {begroting.saldo >= 0 ? '✓' : '⚠'}
          </div>
          <div className="saldo-body">
            <div className="saldo-titel">
              {begroting.saldo >= 0 ? 'Ruimte (overschot)' : 'Tekort'}
            </div>
            <div className="saldo-bedrag">{fmtCur(Math.abs(begroting.saldo))}</div>
            <div className="saldo-msg">
              {begroting.saldo >= 0
                ? 'Het beschikbare bedrag dekt de aankoop ruimschoots. Houd rekening met onvoorziene kosten.'
                : 'Het beschikbare bedrag is onvoldoende voor de aankoop. Bekijk je opties met een adviseur.'}
            </div>
          </div>
        </div>
      </div>

      <div className="result-disclaimer">
        Dit is een indicatieve inschatting op basis van jullie antwoorden — geen bindend advies.
        Voor een definitief oordeel hebben we salarisstroken, werkgeversverklaring en
        koop-/aanneemovereenkomst nodig.
      </div>
    </div>
  );
}

// ============================================================
// RAPPORT PRINT — clean A4-layout voor afdrukken / PDF-export
// ============================================================

function RapportPrint({ state, maxLoan, begroting, ibl1, ibl2 }) {
  const fullName = (vn, tv, an) => [vn, tv, an].filter(Boolean).join(' ').trim();
  const a1Naam = fullName(state.a1Voornaam, state.a1Tussenvoegsel, state.a1Achternaam) || '—';
  const a2Naam = state.samen === 'ja'
    ? (fullName(state.a2Voornaam, state.a2Tussenvoegsel, state.a2Achternaam) || '—')
    : null;
  const datum = new Date().toLocaleDateString('nl-NL', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const dossierTitel = a2Naam
    ? `${state.a1Achternaam || 'Dossier'} & ${state.a2Achternaam || ''}`
    : (state.a1Achternaam || 'Dossier');

  const tekort = begroting.saldo < 0;

  return (
    <section className="rapport-print" aria-label="Afdrukbaar rapport">
      <div className="rapport-header">
        <div>
          <div className="rapport-title">Hypotheekdossier</div>
          <div style={{ fontSize: '11pt', marginTop: '4px' }}>{dossierTitel}</div>
        </div>
        <div className="rapport-date">{datum}</div>
      </div>

      <div className="rapport-highlight">
        <div className="lbl">Indicatieve maximale hypotheek</div>
        <div className="val">{fmtCur(maxLoan)}</div>
      </div>

      <div className={tekort ? 'rapport-warn' : 'rapport-positief'}>
        <strong>{tekort ? '⚠ Tekort: ' : '✓ Ruimte: '}</strong>
        {tekort
          ? 'Het beschikbare bedrag is onvoldoende voor de aankoop. Bekijk de opties met een adviseur.'
          : 'Het beschikbare bedrag dekt de aankoop. Houd rekening met onvoorziene kosten.'}
        {' '}Bedrag: <strong>{fmtCur(Math.abs(begroting.saldo))}</strong>
      </div>

      <div className="rapport-section">
        <h3>Persoonlijke gegevens</h3>
        <dl className="rapport-grid">
          <dt>Aanvrager 1</dt><dd>{a1Naam}</dd>
          {state.a1Geboorte && <><dt>Geboortedatum</dt><dd>{state.a1Geboorte}</dd></>}
          {state.a1Email && <><dt>E-mailadres</dt><dd>{state.a1Email}</dd></>}
          {state.a1Telefoon && <><dt>Telefoon</dt><dd>{state.a1Telefoon}</dd></>}
          {(state.a1Postcode || state.a1Straat) && (
            <>
              <dt>Adres</dt>
              <dd>
                {state.a1Straat} {state.a1Huisnr}{state.a1Toevoeging}
                {(state.a1Postcode || state.a1Plaats) && <>, {state.a1Postcode} {state.a1Plaats}</>}
              </dd>
            </>
          )}
          {a2Naam && (
            <>
              <dt>Aanvrager 2</dt><dd>{a2Naam}</dd>
              {state.a2Geboorte && <><dt>Geboortedatum</dt><dd>{state.a2Geboorte}</dd></>}
              {state.a2Email && <><dt>E-mailadres</dt><dd>{state.a2Email}</dd></>}
            </>
          )}
        </dl>
      </div>

      <div className="rapport-section">
        <h3>De aan te kopen woning</h3>
        <dl className="rapport-grid">
          <dt>Koop-/aanneemsom</dt><dd>{fmtCur(num(state.koopsom))}</dd>
          {num(state.meerwerk) > 0 && <><dt>Meerwerk</dt><dd>{fmtCur(num(state.meerwerk))}</dd></>}
          {state.energielabel && <><dt>Energielabel</dt><dd>{state.energielabel}</dd></>}
          <dt>Type</dt><dd>{state.aankoopType === 'nieuwbouw' ? 'Nieuwbouw' : 'Bestaande bouw'}</dd>
          {state.oplevering && <><dt>Oplevering</dt><dd>{state.oplevering}</dd></>}
          {state.huidigeWonen && (
            <><dt>Huidige woonsituatie</dt><dd>{HUIDIG_WONEN_OPTIONS.find(o => o.v === state.huidigeWonen)?.l || state.huidigeWonen}</dd></>
          )}
        </dl>
      </div>

      <div className="rapport-section">
        <h3>Inkomen &amp; verplichtingen</h3>
        <dl className="rapport-grid">
          <dt>Bruto inkomen aanvrager 1</dt>
          <dd>
            {fmtCur(num(state.brutoA1))}
            {state.contractA1 && ` · ${CONTRACT_LABELS[state.contractA1] || state.contractA1}`}
            {ibl1 && ' · IBL-toetsinkomen berekend'}
          </dd>
          {state.samen === 'ja' && (
            <>
              <dt>Bruto inkomen aanvrager 2</dt>
              <dd>
                {fmtCur(num(state.brutoA2))}
                {state.contractA2 && ` · ${CONTRACT_LABELS[state.contractA2] || state.contractA2}`}
                {ibl2 && ' · IBL-toetsinkomen berekend'}
              </dd>
            </>
          )}
          {state.studie1Heeft === 'ja' && (
            <><dt>Studieschuld A1</dt><dd>Hoofdsom {fmtCur(num(state.studie1Hoofdsom))} · rest {fmtCur(num(state.studie1Rest))}</dd></>
          )}
          {state.studie2Heeft === 'ja' && (
            <><dt>Studieschuld A2</dt><dd>Hoofdsom {fmtCur(num(state.studie2Hoofdsom))} · rest {fmtCur(num(state.studie2Rest))}</dd></>
          )}
          {state.heeftLening === 'ja' && (
            <><dt>Lening</dt><dd>{fmtCur(num(state.leningBedrag))} · maandlast {fmtCur(num(state.leningMaand))}</dd></>
          )}
          {state.heeftBkr === 'ja' && (
            <><dt>BKR-limiet</dt><dd>{fmtCur(num(state.bkrLimit))}</dd></>
          )}
          {state.heeftLease === 'ja' && (
            <><dt>Lease</dt><dd>Maandlast {fmtCur(num(state.leaseMaand))}</dd></>
          )}
          {state.heeftAlimentatie === 'ja' && (
            <>
              <dt>Alimentatie</dt>
              <dd>
                {num(state.alimPartner) > 0 && `Partner ${fmtCur(num(state.alimPartner))}`}
                {num(state.alimPartner) > 0 && num(state.alimKind) > 0 && ' · '}
                {num(state.alimKind) > 0 && `Kind ${fmtCur(num(state.alimKind))}`}
              </dd>
            </>
          )}
        </dl>
      </div>

      <div className="rapport-section">
        <h3>Aankoopbegroting — Financieringsbehoefte</h3>
        <table className="rapport-kk">
          <tbody>
            <tr><td>Koop-/aanneemsom</td><td>{fmtCur(begroting.koopsom)}</td></tr>
            {begroting.meerwerk > 0 && <tr><td>Meerwerk</td><td>{fmtCur(begroting.meerwerk)}</td></tr>}
            {!begroting.isNieuwbouw && begroting.ob > 0 && (
              <tr><td>Overdrachtsbelasting (2%)</td><td>{fmtCur(begroting.ob)}</td></tr>
            )}
            <tr><td>Notaris- en leveringskosten</td><td>{fmtCur(begroting.notaris)}</td></tr>
            {!begroting.isNieuwbouw && (
              <tr><td>Taxatiekosten</td><td>{fmtCur(begroting.tax)}</td></tr>
            )}
            <tr><td>Advies- en bemiddelingskosten</td><td>{fmtCur(begroting.advies)}</td></tr>
            <tr><td>NHG borgstellingsprovisie (0,4%)</td><td>{fmtCur(begroting.nhg)}</td></tr>
            {begroting.isNieuwbouw && (
              <tr><td>Renteverlies tijdens de bouw</td><td>{fmtCur(begroting.bouw)}</td></tr>
            )}
            <tr><td>Reservering dubbele woonlasten</td><td>{fmtCur(begroting.dubbel)}</td></tr>
            <tr className="total"><td>Totaal benodigd</td><td>{fmtCur(begroting.totaalBehoefte)}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="rapport-section">
        <h3>Aankoopbegroting — Financieringsmiddelen</h3>
        <table className="rapport-kk">
          <tbody>
            <tr><td>Indicatieve maximale hypotheek</td><td>{fmtCur(maxLoan)}</td></tr>
            <tr><td>Spaargeld</td><td>{fmtCur(num(state.spaargeld))}</td></tr>
            {num(state.schenking) > 0 && <tr><td>Schenking van familie</td><td>{fmtCur(num(state.schenking))}</td></tr>}
            {state.huidigeWonen === 'koop' && num(state.overwaarde) > 0 && (
              <tr><td>Overwaarde huidige woning</td><td>{fmtCur(num(state.overwaarde))}</td></tr>
            )}
            <tr className="total"><td>Totaal beschikbaar</td><td>{fmtCur(begroting.totaalMiddelen)}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="rapport-footer">
        Dit is een indicatief overzicht conform NIBUD/AFM-normen 2026 en IBL-rekenregels 8.1.1.
        Geen bindend financieel advies. Voor een definitieve toets zijn salarisstroken,
        werkgeversverklaring en de koop-/aanneemovereenkomst nodig.
        Gegenereerd door Dossiercompleet + IBL op {datum}.
      </div>
    </section>
  );
}

// ============================================================
// INTAKE FLOW
// ============================================================

const CONTRACT_LABELS = {
  vast: 'Vast contract',
  'tijdelijk-verklaring': 'Tijdelijk + intentieverklaring',
  tijdelijk: 'Tijdelijk',
  zzp: 'ZZP / ondernemer',
  dga: 'DGA / eigen BV',
  pensioen: 'Gepensioneerd / uitkering',
};

function IntakeFlow({
  intakeMode, setIntakeMode, state, setField,
  ibl1, ibl2, onIbl1Parsed, onIbl2Parsed,
  removeIbl1, removeIbl2, onComplete,
}) {
  // STAP 1 — Initiële keuze
  if (intakeMode === 'choice') {
    return (
      <div className="intake">
        <h1 className="intake-title">
          Bereken nauwkeurig je <em>maximale hypotheek</em>
        </h1>
        <p className="intake-sub">
          Conform NIBUD/AFM 2026 én de officiële IBL-rekenregels 8.1.1.
          Hoe wilt u beginnen?
        </p>
        <div className="intake-choices">
          <button
            type="button"
            className="intake-card primary"
            onClick={() => setIntakeMode('digital-samen')}
          >
            <div className="intake-card-icon">📄</div>
            <div className="intake-card-body">
              <div className="intake-card-title-row">
                <span className="intake-card-title">Digitaal ophalen via UWV</span>
                <span className="intake-card-badge">Aanbevolen</span>
              </div>
              <div className="intake-card-desc">
                We halen je inkomen, naam en geboortedatum automatisch op uit het UWV
                verzekeringsbericht. Snelste én meest nauwkeurige route.
              </div>
            </div>
            <div className="intake-card-arrow">→</div>
          </button>

          <button
            type="button"
            className="intake-card"
            onClick={() => {
              setIntakeMode('sections');
              setTimeout(() => {
                const el = document.querySelector('[data-id="a1"]');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 50);
            }}
          >
            <div className="intake-card-icon">✏</div>
            <div className="intake-card-body">
              <div className="intake-card-title-row">
                <span className="intake-card-title">Alles handmatig invullen</span>
              </div>
              <div className="intake-card-desc">
                Vul stap-voor-stap je dossier zelf in. Werkt zonder DigiD.
              </div>
            </div>
            <div className="intake-card-arrow">→</div>
          </button>
        </div>
      </div>
    );
  }

  // STAP 2 — Samen kopen?
  if (intakeMode === 'digital-samen') {
    return (
      <div className="intake">
        <button
          className="intake-back"
          type="button"
          onClick={() => setIntakeMode('choice')}
        >
          ← terug
        </button>
        <div className="intake-step">Stap 1 van 2</div>
        <h2 className="intake-h2">Koop je alleen of met een partner?</h2>
        <p className="intake-sub">
          We hebben dit nodig om te weten hoeveel verzekeringsberichten we moeten ophalen.
        </p>
        <div className="intake-choices row">
          <button
            type="button"
            className="intake-card"
            onClick={() => {
              setField('samen', 'nee');
              setIntakeMode('digital-uploads');
            }}
          >
            <div className="intake-card-icon">👤</div>
            <div className="intake-card-body">
              <div className="intake-card-title">Alleen</div>
              <div className="intake-card-desc">Ik koop deze woning zelfstandig</div>
            </div>
          </button>
          <button
            type="button"
            className="intake-card"
            onClick={() => {
              setField('samen', 'ja');
              setIntakeMode('digital-uploads');
            }}
          >
            <div className="intake-card-icon">👥</div>
            <div className="intake-card-body">
              <div className="intake-card-title">Samen</div>
              <div className="intake-card-desc">Wij kopen samen met een partner</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // STAP 3 — Upload verzekeringsberichten
  if (intakeMode === 'digital-uploads') {
    const needsTwo = state.samen === 'ja';
    const allDone = !!ibl1 && (!needsTwo || !!ibl2);

    return (
      <div className="intake">
        <button
          className="intake-back"
          type="button"
          onClick={() => setIntakeMode('digital-samen')}
        >
          ← terug
        </button>
        <div className="intake-step">Stap 2 van 2</div>
        <h2 className="intake-h2">
          Upload {needsTwo ? 'je verzekeringsberichten' : 'je verzekeringsbericht'}
        </h2>
        <div className="intake-help">
          Download het Verzekeringsbericht via{' '}
          <a
            href="https://www.uwv.nl/particulieren/persoonlijk/mijn-uwv"
            target="_blank"
            rel="noopener noreferrer"
          >
            Mijn UWV
          </a>{' '}
          met DigiD. Tip: download als origineel PDF — niet scannen of fotograferen, dan blijft
          het digitaal waarmerk geldig.
        </div>

        <div className="intake-uploads">
          <div className="intake-upload-block">
            <div className="intake-upload-label">
              {needsTwo ? 'Aanvrager 1' : 'Verzekeringsbericht'}
            </div>
            {!ibl1 ? (
              <IblUpload
                aanvragerLabel={needsTwo ? 'aanvrager 1' : 'jou'}
                prefix="a1"
                onParsed={onIbl1Parsed}
                eigenBijdrage={0}
                compact
              />
            ) : (
              <div className="intake-upload-done">
                <div className="intake-upload-done-icon">✓</div>
                <div className="intake-upload-done-info">
                  <div className="intake-upload-done-name">
                    {ibl1.parsed.aanvragerNaam || 'Aanvrager 1'}
                  </div>
                  <div className="intake-upload-done-amount">
                    Toetsinkomen: <strong>{fmtEur(ibl1.resultaat.finalToetsinkomen)}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  className="intake-upload-done-replace"
                  onClick={removeIbl1}
                >
                  Vervangen
                </button>
              </div>
            )}
          </div>

          {needsTwo && (
            <div className="intake-upload-block">
              <div className="intake-upload-label">Aanvrager 2</div>
              {!ibl2 ? (
                <IblUpload
                  aanvragerLabel="aanvrager 2"
                  prefix="a2"
                  onParsed={onIbl2Parsed}
                  eigenBijdrage={0}
                  compact
                />
              ) : (
                <div className="intake-upload-done">
                  <div className="intake-upload-done-icon">✓</div>
                  <div className="intake-upload-done-info">
                    <div className="intake-upload-done-name">
                      {ibl2.parsed.aanvragerNaam || 'Aanvrager 2'}
                    </div>
                    <div className="intake-upload-done-amount">
                      Toetsinkomen: <strong>{fmtEur(ibl2.resultaat.finalToetsinkomen)}</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="intake-upload-done-replace"
                    onClick={removeIbl2}
                  >
                    Vervangen
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="intake-actions">
          <button
            type="button"
            className="intake-continue"
            disabled={!allDone}
            onClick={() => setIntakeMode('digital-review')}
          >
            {allDone
              ? 'Bekijk wat we hebben gevonden →'
              : needsTwo
                ? `Upload ${(!ibl1 ? 1 : 0) + (!ibl2 ? 1 : 0)} verzekeringsbericht${(!ibl1 && !ibl2) ? 'en' : ''} om door te gaan`
                : 'Upload verzekeringsbericht om door te gaan'}
          </button>
          <button
            type="button"
            className="btn-link"
            onClick={() => {
              setIntakeMode('sections');
              setTimeout(() => {
                const el = document.querySelector('[data-id="a1"]');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 50);
            }}
          >
            Geen DigiD bij de hand? Toch handmatig invullen
          </button>
        </div>
      </div>
    );
  }

  // STAP 4 — Review wat we hebben opgehaald
  if (intakeMode === 'digital-review') {
    return (
      <div className="intake">
        <div className="intake-success-icon">✓</div>
        <h2 className="intake-h2">Gegevens succesvol opgehaald</h2>
        <p className="intake-sub">
          Dit is wat we uit je verzekeringsbericht{state.samen === 'ja' ? 'en' : ''} hebben gehaald.
          Op de volgende pagina vul je nog je adres en woningwensen aan.
        </p>

        <div className="intake-summary">
          <IntakeSummaryCard
            title={state.samen === 'ja' ? 'Aanvrager 1' : 'Jou'}
            voornaam={state.a1Voornaam}
            tussenvoegsel={state.a1Tussenvoegsel}
            achternaam={state.a1Achternaam}
            geboorte={state.a1Geboorte}
            bruto={state.brutoA1}
            contract={state.contractA1}
          />
          {state.samen === 'ja' && (
            <IntakeSummaryCard
              title="Aanvrager 2"
              voornaam={state.a2Voornaam}
              tussenvoegsel={state.a2Tussenvoegsel}
              achternaam={state.a2Achternaam}
              geboorte={state.a2Geboorte}
              bruto={state.brutoA2}
              contract={state.contractA2}
            />
          )}
        </div>

        <div className="intake-actions">
          <button
            type="button"
            className="intake-continue"
            onClick={onComplete}
          >
            Verder met dossier →
          </button>
          <button
            type="button"
            className="btn-link"
            onClick={() => setIntakeMode('digital-uploads')}
          >
            Aanpassen
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function IntakeSummaryCard({ title, voornaam, tussenvoegsel, achternaam, geboorte, bruto, contract }) {
  const naam = [voornaam, tussenvoegsel, achternaam].filter(Boolean).join(' ').trim() || '—';
  const geb = geboorte ? new Date(geboorte).toLocaleDateString('nl-NL') : null;
  return (
    <div className="intake-summary-card">
      <div className="intake-summary-card-title">{title}</div>
      <div className="intake-summary-row">
        <span className="intake-summary-label">Naam</span>
        <span className="intake-summary-value">{naam}</span>
      </div>
      {geb && (
        <div className="intake-summary-row">
          <span className="intake-summary-label">Geboortedatum</span>
          <span className="intake-summary-value">{geb}</span>
        </div>
      )}
      {bruto && (
        <div className="intake-summary-row">
          <span className="intake-summary-label">Toetsinkomen (IBL)</span>
          <span className="intake-summary-value">{fmtCur(num(bruto))}</span>
        </div>
      )}
      {contract && (
        <div className="intake-summary-row">
          <span className="intake-summary-label">Type contract</span>
          <span className="intake-summary-value">{CONTRACT_LABELS[contract] || contract}</span>
        </div>
      )}
    </div>
  );
}
