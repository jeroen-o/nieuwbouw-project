import React, { useState, useRef, useEffect } from 'react';
import {
  parseAndCalculate,
  splitsAanvragerNaam,
  mapContractvormNaarDossier,
  dateToInputString,
  fmtEur,
  REKENREGELS_VERSIE,
} from './iblEngine';

// Load PDF.js once for the whole app (used by extractTextFromPdf)
let pdfLoadPromise = null;
function ensurePdfJs() {
  if (window.pdfjsLib) return Promise.resolve();
  if (pdfLoadPromise) return pdfLoadPromise;
  pdfLoadPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve();
    };
    s.onerror = () => reject(new Error('Kon PDF.js niet laden — check je internetverbinding.'));
    document.head.appendChild(s);
  });
  return pdfLoadPromise;
}

/**
 * IBL Upload widget — verschijnt boven de inkomen-velden van een aanvrager.
 * Bij upload + parse + bereken: roept onParsed(payload) aan met:
 *   { iblData: { parsed, resultaat }, autoFill: { brutoA1, contractA1, a1Voornaam, ... } }
 *
 * @param {boolean} compact — kleinere variant, alleen knop zonder uitleg-blok
 */
export function IblUpload({ aanvragerLabel, prefix, onParsed, eigenBijdrage = 0, compact = false }) {
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    ensurePdfJs().catch((e) => setError(e.message));
  }, []);

  const handleFile = async (file) => {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name)) {
      setError('Selecteer een PDF-bestand (UWV Verzekeringsbericht).');
      return;
    }
    setError(null);
    setParsing(true);
    setProgress('PDF wordt gelezen…');
    try {
      await ensurePdfJs();
      setProgress('Verzekeringsbericht wordt geanalyseerd…');
      const result = await parseAndCalculate(file, eigenBijdrage);
      if (result.error) {
        setError(result.error);
        setParsing(false);
        return;
      }
      const { parsed, resultaat } = result;
      if (!resultaat.success) {
        setError(resultaat.error || 'Berekening niet mogelijk. Controleer of het verzekeringsbericht volledig is.');
        setParsing(false);
        return;
      }
      setProgress('Klaar!');

      // Bouw auto-fill payload met prefix (a1 of a2)
      const naamSplit = splitsAanvragerNaam(parsed.aanvragerNaam || '');
      const eersteWg = parsed.werkgevers && parsed.werkgevers[0];
      const contract = eersteWg
        ? mapContractvormNaarDossier(eersteWg.contractvorm, eersteWg.isUitkering)
        : '';

      const autoFill = {};
      if (naamSplit.voornaam) autoFill[`${prefix}Voornaam`] = naamSplit.voornaam;
      if (naamSplit.tussenvoegsel) autoFill[`${prefix}Tussenvoegsel`] = naamSplit.tussenvoegsel;
      if (naamSplit.achternaam) autoFill[`${prefix}Achternaam`] = naamSplit.achternaam;
      if (parsed.geboortedatum)
        autoFill[`${prefix}Geboorte`] = dateToInputString(parsed.geboortedatum);

      const isA1 = prefix === 'a1';
      autoFill[isA1 ? 'brutoA1' : 'brutoA2'] = String(Math.round(resultaat.finalToetsinkomen));
      if (contract) autoFill[isA1 ? 'contractA1' : 'contractA2'] = contract;

      onParsed({ iblData: { parsed, resultaat }, autoFill });
      setParsing(false);
      setProgress('');
    } catch (e) {
      setError(e.message || 'Onbekende fout bij parsen van PDF.');
      setParsing(false);
      setProgress('');
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // Compact variant: alleen een grote knop voor in de intake-flow
  if (compact) {
    return (
      <div
        className={`ibl-upload-compact ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <button
          type="button"
          className="ibl-upload-compact-btn"
          disabled={parsing}
          onClick={() => inputRef.current && inputRef.current.click()}
        >
          {parsing ? `⏳ ${progress || 'bezig…'}` : '📎 Upload PDF'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files && e.target.files[0])}
        />
        {error && <div className="ibl-error" style={{ marginTop: 10 }}>⚠ {error}</div>}
      </div>
    );
  }

  return (
    <div
      className={`ibl-upload ${dragging ? 'dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div className="ibl-upload-head">
        <div className="ibl-upload-head-text">
          <div className="ibl-upload-icon">📄</div>
          <div className="ibl-upload-text">
            <div className="ibl-upload-title">Bereken nauwkeurig met UWV verzekeringsbericht</div>
            <div className="ibl-upload-sub">
              Upload het UWV Verzekeringsbericht van {aanvragerLabel} → wij berekenen automatisch het
              toetsinkomen conform IBL Rekenregels {REKENREGELS_VERSIE} en vullen alle gegevens in.
            </div>
          </div>
        </div>
        <button
          type="button"
          className="ibl-upload-btn"
          disabled={parsing}
          onClick={() => inputRef.current && inputRef.current.click()}
        >
          {parsing ? '⏳ bezig…' : '📎 Upload PDF'}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files && e.target.files[0])}
      />
      {parsing && <div className="ibl-status">⏳ {progress}</div>}
      {error && <div className="ibl-error">⚠ {error}</div>}
      <div className="ibl-upload-help">
        Het Verzekeringsbericht download je via{' '}
        <a
          href="https://www.uwv.nl/particulieren/persoonlijk/mijn-uwv"
          target="_blank"
          rel="noopener noreferrer"
        >
          Mijn UWV
        </a>{' '}
        met DigiD. Tip: download als origineel PDF, niet scannen of fotograferen — anders gaat het
        digitaal waarmerk verloren.
      </div>
    </div>
  );
}

/**
 * IBL Result Card — verschijnt zodra een verzekeringsbericht is geüpload.
 * Toont toetsinkomen + werkgevers + knop voor detail-weergave.
 */
export function IblResultCard({ iblData, onShowDetail, onRemove, onReplaceClick }) {
  if (!iblData || !iblData.resultaat) return null;
  const { parsed, resultaat } = iblData;

  return (
    <div className="ibl-result">
      <div className="ibl-result-head">
        <div style={{ flex: 1 }}>
          <div className="ibl-result-title">
            ✅ Toetsinkomen berekend uit verzekeringsbericht
          </div>
          <div className="ibl-result-amount">{fmtEur(resultaat.finalToetsinkomen)}</div>
          <span className="ibl-result-cat">Categorie {resultaat.primaryCategory}</span>
        </div>
      </div>

      {parsed.aanvragerNaam && (
        <div className="ibl-result-meta">
          <strong>{parsed.aanvragerNaam}</strong>
          {parsed.geboortedatum && ` · geboren ${parsed.geboortedatum.toLocaleDateString('nl-NL')}`}
          {parsed.aanmaakdatum && ` · VZB van ${parsed.aanmaakdatum.toLocaleDateString('nl-NL')}`}
        </div>
      )}

      {resultaat.werkgeverResults && resultaat.werkgeverResults.length > 0 && (
        <div className="ibl-werkgevers">
          {resultaat.werkgeverResults.map((wr, i) => (
            <div className="ibl-werkgever" key={i}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="ibl-werkgever-naam">{wr.werkgever.naam}</div>
                <div className="ibl-werkgever-cv">
                  {wr.werkgever.contractvorm} · cat. {wr.category}
                </div>
              </div>
              <div className="ibl-werkgever-bedrag">
                {fmtEur(wr.berekening?.toetsinkomen ?? 0)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="ibl-result-actions">
        <button type="button" className="ibl-result-btn" onClick={onShowDetail}>
          🔍 Bekijk berekening
        </button>
        <button type="button" className="ibl-result-btn" onClick={onReplaceClick}>
          🔄 Andere PDF uploaden
        </button>
        <button type="button" className="ibl-result-btn danger" onClick={onRemove}>
          🗑️ Verwijderen
        </button>
      </div>
    </div>
  );
}

/**
 * Modal met de volledige IBL-berekening
 */
export function IblDetailModal({ iblData, onClose }) {
  if (!iblData || !iblData.resultaat) return null;
  const { parsed, resultaat } = iblData;

  return (
    <div className="ibl-modal-overlay show" onClick={onClose}>
      <div className="ibl-modal" onClick={(e) => e.stopPropagation()}>
        <button className="ibl-modal-close" onClick={onClose} aria-label="Sluiten">
          ×
        </button>
        <h3>Toelichting IBL-berekening</h3>
        <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
          Conform Rekenregels Inkomensbepaling Loondienst {REKENREGELS_VERSIE}. Voor de officiële
          en juridisch geldige berekening: zie HDN-API. Deze berekening is indicatief.
        </p>

        <h4>Algemene info</h4>
        <div className="ibl-modal-info">
          <dt>Naam:</dt>
          <dd>{parsed.aanvragerNaam || '—'}</dd>
          {parsed.geboortedatum && (
            <>
              <dt>Geboortedatum:</dt>
              <dd>{parsed.geboortedatum.toLocaleDateString('nl-NL')}</dd>
            </>
          )}
          {parsed.aanmaakdatum && (
            <>
              <dt>VZB-datum:</dt>
              <dd>{parsed.aanmaakdatum.toLocaleDateString('nl-NL')}</dd>
            </>
          )}
          {parsed.vzbVersie && (
            <>
              <dt>VZB-versie:</dt>
              <dd>{parsed.vzbVersie}</dd>
            </>
          )}
          <br />
          <dt>Berekeningscategorie:</dt>
          <dd>
            <strong style={{ color: '#0A2D7A' }}>{resultaat.primaryCategory}</strong>
          </dd>
          <dt>Samenstelling:</dt>
          <dd>{resultaat.samenstelling}</dd>
          <br />
          <dt>Toetsinkomen:</dt>
          <dd>
            <strong style={{ color: '#0A2D7A', fontSize: 16 }}>
              {fmtEur(resultaat.finalToetsinkomen)}
            </strong>
          </dd>
        </div>

        <h4>Toelichting</h4>
        <p style={{ fontSize: 13, color: '#1F2937', lineHeight: 1.6 }}>
          {resultaat.omschrijving}
        </p>

        <h4>Werkgevers / Contracten</h4>
        <table>
          <thead>
            <tr>
              <th>Werkgever</th>
              <th>Contract</th>
              <th>Cat.</th>
              <th className="num">Toetsinkomen</th>
            </tr>
          </thead>
          <tbody>
            {resultaat.werkgeverResults.map((wr, i) => (
              <tr key={i}>
                <td>{wr.werkgever.naam}</td>
                <td style={{ fontSize: 12, color: '#6B7280' }}>
                  {wr.werkgever.contractvorm}
                </td>
                <td>{wr.category}</td>
                <td className="num">{fmtEur(wr.berekening?.toetsinkomen ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {resultaat.werkgeverResults.some((wr) => wr.berekening?.detail) && (
          <>
            <h4>Berekeningsdetails</h4>
            <div style={{ fontSize: 12, color: '#1F2937' }}>
              {resultaat.werkgeverResults.map(
                (wr, i) =>
                  wr.berekening?.detail && (
                    <div
                      key={i}
                      style={{
                        marginBottom: 10,
                        padding: 10,
                        background: '#F8F6F2',
                        borderRadius: 8,
                      }}
                    >
                      <strong>{wr.werkgever.naam}:</strong> {wr.berekening.detail}
                    </div>
                  )
              )}
            </div>
          </>
        )}

        <div
          style={{
            marginTop: 22,
            padding: 12,
            background: 'rgba(196, 245, 78, 0.15)',
            borderRadius: 10,
            fontSize: 12,
            color: '#0A2D7A',
            lineHeight: 1.5,
          }}
        >
          ℹ️ Financiers die IBL hanteren hebben een eigen acceptatiebeleid. Deze berekening is
          indicatief — raadpleeg het IBL-acceptatiebeleid van de gewenste geldverstrekker.
        </div>
      </div>
    </div>
  );
}
