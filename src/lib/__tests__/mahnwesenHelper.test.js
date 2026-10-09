import { describe, it, expect } from 'vitest'
import {
  roundToFiveRappen,
  calculateVerzugstage,
  calculateVerzugszins,
  calculateMahnungTotal,
  getMahnVorschlag,
  generateMahntext,
  generateBetreibungsbegehrenData,
  DEFAULT_MAHNSTUFEN
} from '../mahnwesenHelper'

describe('mahnwesenHelper - Schweizer Mahnwesen & SchKG', () => {
  describe('roundToFiveRappen', () => {
    it('rundet Schweizer Rappen kaufmännisch auf 0.05', () => {
      expect(roundToFiveRappen(100.02)).toBe(100.00)
      expect(roundToFiveRappen(100.03)).toBe(100.05)
      expect(roundToFiveRappen(100.07)).toBe(100.05)
      expect(roundToFiveRappen(100.08)).toBe(100.10)
      expect(roundToFiveRappen(0)).toBe(0)
      expect(roundToFiveRappen(null)).toBe(0)
    })
  })

  describe('calculateVerzugstage', () => {
    it('berechnet Verzugstage korrekt ab Fälligkeit', () => {
      const faellig = '2026-01-01'
      const stichtag = '2026-01-31'
      expect(calculateVerzugstage(faellig, stichtag)).toBe(30)
    })

    it('gibt 0 zurück, wenn noch nicht fällig', () => {
      const faellig = '2026-02-15'
      const stichtag = '2026-02-01'
      expect(calculateVerzugstage(faellig, stichtag)).toBe(0)
    })
  })

  describe('calculateVerzugszins (Art. 104 OR - 5% p.a. 30/360)', () => {
    it('berechnet 5% p.a. Zins taggenau bezogen auf 360 Tage', () => {
      // CHF 10'000 * 5% = CHF 500 pro Jahr (360 Tage)
      // Für 36 Tage = CHF 50.00
      const zins = calculateVerzugszins(10000, 36, 0.05)
      expect(zins).toBe(50.00)
    })

    it('rundet das Ergebnis auf 5 Rappen', () => {
      // 1234.50 * 0.05 * 17 / 360 = 2.9148... -> 2.90
      const zins = calculateVerzugszins(1234.50, 17, 0.05)
      expect(zins).toBe(2.90)
    })

    it('gibt 0 zurück bei 0 Verzugstagen oder negativem Betrag', () => {
      expect(calculateVerzugszins(1000, 0)).toBe(0)
      expect(calculateVerzugszins(0, 30)).toBe(0)
      expect(calculateVerzugszins(-500, 30)).toBe(0)
    })
  })

  describe('calculateMahnungTotal', () => {
    it('addiert Restforderung, Mahnspesen und Verzugszins', () => {
      const total = calculateMahnungTotal({
        restbetrag: 1500.00,
        spesen: 20.00,
        verzugszins: 12.50
      })
      expect(total).toBe(1532.50)
    })
  })

  describe('getMahnVorschlag', () => {
    it('meldet erledigt bei bezahlter Rechnung', () => {
      const rechnung = { status: 'Bezahlt', total: 1000, bezahlt: 1000 }
      const res = getMahnVorschlag(rechnung)
      expect(res.status).toBe('erledigt')
      expect(res.isActionNeeded).toBe(false)
    })

    it('respektiert aktiven Mahnstopp', () => {
      const rechnung = {
        status: 'Gemahnt',
        total: 1000,
        bezahlt: 0,
        faellig_am: '2026-01-01',
        daten: {
          mahnstopp: true,
          mahnstopp_grund: 'Mängelrüge Gipserarbeiten'
        }
      }
      const res = getMahnVorschlag(rechnung, '2026-02-01')
      expect(res.status).toBe('mahnstopp')
      expect(res.isActionNeeded).toBe(false)
      expect(res.mahnstoppGrund).toBe('Mängelrüge Gipserarbeiten')
    })

    it('schlägt Stufe 1 vor, wenn Rechnung neu überfällig ist', () => {
      const rechnung = {
        status: 'Überfällig',
        total: 2500,
        bezahlt: 0,
        faellig_am: '2026-01-10',
        daten: { mahnstufe: 0 }
      }
      const res = getMahnVorschlag(rechnung, '2026-01-20')
      expect(res.status).toBe('mahnung_faellig')
      expect(res.naechsteStufe).toBe(1)
      expect(res.isActionNeeded).toBe(true)
      expect(res.spesen).toBe(0)
      expect(res.verzugszins).toBe(0)
    })

    it('schlägt Stufe 2 mit CHF 20 Spesen vor, wenn Stufe 1 Frist abgelaufen ist', () => {
      const rechnung = {
        status: 'Gemahnt',
        total: 2500,
        bezahlt: 0,
        faellig_am: '2026-01-01',
        daten: {
          mahnstufe: 1,
          mahnungen: [
            { stufe: 1, datum: '2026-01-10', fristTage: 10 }
          ]
        }
      }
      // 12 Tage später (2026-01-22)
      const res = getMahnVorschlag(rechnung, '2026-01-22')
      expect(res.status).toBe('mahnung_faellig')
      expect(res.naechsteStufe).toBe(2)
      expect(res.spesen).toBe(20.00)
    })

    it('schlägt Stufe 3 mit 5% OR Verzugszins und CHF 30 Spesen vor', () => {
      const rechnung = {
        status: 'Gemahnt',
        total: 10000,
        bezahlt: 2000,
        faellig_am: '2026-01-01',
        daten: {
          mahnstufe: 2,
          mahnungen: [
            { stufe: 1, datum: '2026-01-10', fristTage: 10 },
            { stufe: 2, datum: '2026-01-20', fristTage: 10 }
          ]
        }
      }
      // Nachfrist Stufe 2 am 30.01. abgelaufen. Stichtag 01.02. (31 Verzugstage)
      const res = getMahnVorschlag(rechnung, '2026-02-01')
      expect(res.status).toBe('mahnung_faellig')
      expect(res.naechsteStufe).toBe(3)
      expect(res.spesen).toBe(30.00)
      expect(res.restbetrag).toBe(8000)
      expect(res.verzugszins).toBeGreaterThan(0)
    })

    it('schlägt SchKG Betreibung vor, wenn Stufe 3 abgelaufen ist', () => {
      const rechnung = {
        status: 'Gemahnt',
        total: 5000,
        bezahlt: 0,
        faellig_am: '2026-01-01',
        daten: {
          mahnstufe: 3,
          mahnungen: [
            { stufe: 1, datum: '2026-01-10', fristTage: 10 },
            { stufe: 2, datum: '2026-01-20', fristTage: 10 },
            { stufe: 3, datum: '2026-02-01', fristTage: 5 }
          ]
        }
      }
      // Stichtag 2026-02-10 (9 Tage nach Stufe 3, Frist war 5 Tage)
      const res = getMahnVorschlag(rechnung, '2026-02-10')
      expect(res.status).toBe('betreibung_bereit')
      expect(res.naechsteStufe).toBe('betreibung')
      expect(res.isActionNeeded).toBe(true)
    })
  })

  describe('generateMahntext', () => {
    const rechnung = { id: '123', rechnung_nr: 'RE-2026-123', rechnungsdatum: '2026-01-01', faellig_am: '2026-01-31' }
    const kunde = { geschlecht: 'm', nachname: 'Muster', firmenname: '' }
    const settings = { firmenname: 'Muster Malerei AG' }

    it('erzeugt Stufe 1 Text freundlich und ohne Betreibungsandrohung', () => {
      const text = generateMahntext(1, {
        rechnung,
        kunde,
        settings,
        fristDatumStr: '15.02.2026',
        restbetrag: 1200,
        spesen: 0,
        verzugszins: 0,
        gesamtforderung: 1200
      })
      expect(text.titel).toContain('Zahlungserinnerung')
      expect(text.betreff).toContain('RE-2026-123')
      expect(text.einleitung).toContain('Sehr geehrter Herr Muster')
      expect(text.einleitung).not.toContain('Betreibung')
    })

    it('erzeugt Stufe 3 Text mit förmlicher Betreibungsandrohung nach SchKG', () => {
      const text = generateMahntext(3, {
        rechnung,
        kunde,
        settings,
        fristDatumStr: '10.02.2026',
        restbetrag: 1200,
        spesen: 30,
        verzugszins: 15,
        gesamtforderung: 1245
      })
      expect(text.titel).toContain('letzte Mahnung vor Einleitung der Betreibung')
      expect(text.mahnhinweis).toContain('BETREIBUNGSBEGEHREN')
      expect(text.mahnhinweis).toContain('Art. 67 SchKG')
    })
  })

  describe('generateBetreibungsbegehrenData', () => {
    it('erstellt SchKG-konformes Datenset mit Gläubiger, Schuldner und Zinsbeginn', () => {
      const rechnung = {
        id: '99',
        rechnung_nr: 'RE-2026-099',
        total: 4500,
        bezahlt: 1000,
        rechnungsdatum: '2026-01-01',
        faellig_am: '2026-01-31',
        daten: {
          mahnungen: [
            { stufe: 2, spesen: 20, datum: '2026-02-15' },
            { stufe: 3, spesen: 30, datum: '2026-03-01' }
          ]
        }
      }
      const kunde = {
        name: 'Peter Gerber',
        strasse: 'Gartenweg 12',
        plz_ort: '3000 Bern'
      }
      const settings = {
        firmenname: 'Muster Malerei AG',
        strasse: 'Werkstrasse 4',
        plz_ort: '3018 Bern',
        qr_iban: 'CH4431999123000889012'
      }

      const dossier = generateBetreibungsbegehrenData({ rechnung, kunde, settings })
      expect(dossier.art).toContain('Art. 67 SchKG')
      expect(dossier.glaeubiger.name).toBe('Muster Malerei AG')
      expect(dossier.schuldner.name).toBe('Peter Gerber')
      expect(dossier.forderung.grundforderung).toBe(3500)
      expect(dossier.forderung.zins.satz).toBe(5.0)
      expect(dossier.forderung.zins.zinsbeginn).toBe('2026-01-31')
      expect(dossier.forderung.mahnspesen).toBe(50.00)
    })
  })
})
