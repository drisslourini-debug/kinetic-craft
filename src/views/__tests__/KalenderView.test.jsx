import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import KalenderView from '../KalenderView';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table) => {
      if (table === 'einstellungen') {
        return {
          select: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { firmenname: 'Test Atelier', kanton: 'ZH' },
            error: null
          })
        };
      }
      if (table === 'termine') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 1,
                titel: 'Test Montage',
                datum: '2026-09-15',
                typ: 'Montage',
                status: 'Geplant',
                ganztaegig: true
              }
            ],
            error: null
          })
        };
      }
      if (table === 'rechnungen') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [
              {
                id: 101,
                rechnung_nr: 'RE-2026-0101',
                total: 2500,
                status: 'Versendet',
                faellig_am: '2026-09-20',
                kunden: { name: 'Muster AG' }
              }
            ],
            error: null
          })
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null })
      };
    })
  }
}));

// Mock holiday service
vi.mock('../../lib/holidayService', () => ({
  getHolidays: vi.fn().mockResolvedValue([])
}));

describe('KalenderView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders calendar title and view mode buttons', async () => {
    render(<KalenderView onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Kalender & Termine/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /^Monat$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Woche$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Agenda$/i })).toBeInTheDocument();
  });

  it('switches to agenda view when clicked', async () => {
    render(<KalenderView onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Kalender & Termine/i)).toBeInTheDocument();
    });

    const agendaBtn = screen.getByRole('button', { name: /^Agenda$/i });
    fireEvent.click(agendaBtn);

    await waitFor(() => {
      expect(screen.getByText(/Test Montage/i)).toBeInTheDocument();
    });
  });

  it('opens appointment creation modal on "+ Neuer Termin" click', async () => {
    render(<KalenderView onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Kalender & Termine/i)).toBeInTheDocument();
    });

    const createBtn = screen.getByRole('button', { name: /\+ Neuer Termin/i });
    fireEvent.click(createBtn);

    expect(screen.getByText(/Neuer Termin erfassen/i)).toBeInTheDocument();
  });

  it('automatically opens create modal when viewParams.action is create', async () => {
    render(
      <KalenderView 
        onNavigate={vi.fn()} 
        viewParams={{ action: 'create', date: '2026-09-25', projektId: 'p-42' }} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Neuer Termin erfassen/i)).toBeInTheDocument();
    });
  });

  it('displays invoice due date in agenda and opens preview card with quick action', async () => {
    render(<KalenderView onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Kalender & Termine/i)).toBeInTheDocument();
    });

    const agendaBtn = screen.getByRole('button', { name: /^Agenda$/i });
    fireEvent.click(agendaBtn);

    await waitFor(() => {
      expect(screen.getByText(/Rechnung RE-2026-0101/i)).toBeInTheDocument();
    });

    const invoiceItem = screen.getByText(/Rechnung RE-2026-0101/i);
    fireEvent.click(invoiceItem);

    await waitFor(() => {
      expect(screen.getByText(/Rechnung öffnen/i)).toBeInTheDocument();
    });
  });
});
