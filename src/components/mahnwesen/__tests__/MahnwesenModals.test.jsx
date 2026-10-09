import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MahnungModal from '../MahnungModal'
import BetreibungsModal from '../BetreibungsModal'

describe('Mahnwesen Modals', () => {
  const dummyRechnung = {
    id: '42',
    rechnung_nr: 'RE-2026-042',
    total: 3000,
    bezahlt: 500,
    faellig_am: '2026-01-01',
    rechnungsdatum: '2025-12-01',
    status: 'Überfällig',
    daten: {
      mahnstufe: 0,
      mahnungen: []
    }
  }

  const dummyKunde = {
    id: '10',
    firmenname: 'Bau AG Bern',
    strasse: 'Kranweg 5',
    plz_ort: '3000 Bern'
  }

  const dummySettings = {
    firmenname: 'Muster Malerei AG',
    strasse: 'Handwerkergasse 1',
    plz_ort: '3018 Bern',
    qr_iban: 'CH4431999123000889012'
  }

  describe('MahnungModal', () => {
    it('rendert den Mahn-Assistenten mit berechneter Restforderung', () => {
      render(
        <MahnungModal
          isOpen={true}
          onClose={vi.fn()}
          rechnung={dummyRechnung}
          kunde={dummyKunde}
          settings={dummySettings}
          onSaveMahnung={vi.fn()}
        />
      )

      expect(screen.getByText('Schweizer Mahnwesen')).toBeInTheDocument()
      expect(screen.getByText('RE-2026-042')).toBeInTheDocument()
      expect(screen.getByText('Zahlungserinnerung')).toBeInTheDocument()
      expect(screen.getByText('1. Mahnung')).toBeInTheDocument()
      expect(screen.getByText('Mahnung (Stufe 1) ausstellen')).toBeInTheDocument()
    })

    it('erlaubt Wechsel auf Mahnstopp Tab', () => {
      render(
        <MahnungModal
          isOpen={true}
          onClose={vi.fn()}
          rechnung={dummyRechnung}
          kunde={dummyKunde}
          settings={dummySettings}
          onSaveMahnung={vi.fn()}
        />
      )

      const mahnstoppTab = screen.getByRole('button', { name: /Mahnstopp/i })
      fireEvent.click(mahnstoppTab)

      expect(screen.getByText('Was bewirkt der Mahnstopp?')).toBeInTheDocument()
    })
  })

  describe('BetreibungsModal', () => {
    it('rendert das SchKG Betreibungsbegehren Dossier', () => {
      render(
        <BetreibungsModal
          isOpen={true}
          onClose={vi.fn()}
          rechnung={dummyRechnung}
          kunde={dummyKunde}
          settings={dummySettings}
        />
      )

      expect(screen.getByText('Betreibungsbegehren (Art. 67 SchKG)')).toBeInTheDocument()
      expect(screen.getByText('Bau AG Bern')).toBeInTheDocument()
      expect(screen.getByText('Muster Malerei AG')).toBeInTheDocument()
      expect(screen.getByText('Dossier Drucken')).toBeInTheDocument()
    })
  })
})
