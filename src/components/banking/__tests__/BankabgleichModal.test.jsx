import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BankabgleichModal from '../BankabgleichModal'
import { generateQrReference } from '../../../lib/qrHelper'

// Mock supabase
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      }))
    }))
  }
}))

describe('BankabgleichModal', () => {
  const qrRef = generateQrReference(10, 201)
  const mockInvoices = [
    {
      id: 201,
      kunden_id: 10,
      rechnung_nr: 'RE-2026-201',
      total: 1500.00,
      bezahlt: 0,
      status: 'Versendet',
      kunden: { name: 'Beatrix Brunner' },
      daten: { qr_reference: qrRef, zahlungen: [] }
    }
  ]

  it('renders modal in upload step initially', () => {
    render(
      <BankabgleichModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        invoices={mockInvoices}
      />
    )

    expect(screen.getByText('Bankauszug abgleichen (camt.054 / 053)')).toBeInTheDocument()
    expect(screen.getByText(/Kontoauszug hier ablegen oder Datei auswählen/i)).toBeInTheDocument()
  })

  it('processes camt.054 XML upload and displays reconciliation overview', async () => {
    const { container } = render(
      <BankabgleichModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        invoices={mockInvoices}
      />
    )

    const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.054.001.02">
  <BkToCstmrDbtCdtNtfctn>
    <Ntfctn>
      <Ntry>
        <Amt Ccy="CHF">1500.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <BookgDt><Dt>2026-10-04</Dt></BookgDt>
        <NtryDtls>
          <TxDtls>
            <Refs><AcctSvcrRef>TX-TEST-201</AcctSvcrRef></Refs>
            <Amt Ccy="CHF">1500.00</Amt>
            <RltdPties><Dbtr><Nm>Beatrix Brunner</Nm></Dbtr></RltdPties>
            <RmtInf>
              <Strd>
                <CdtrRefInf><Ref>${qrRef}</Ref></CdtrRefInf>
              </Strd>
            </RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>
    </Ntfctn>
  </BkToCstmrDbtCdtNtfctn>
</Document>`

    const file = new File([sampleXml], 'bankauszug.xml', { type: 'text/xml' })
    const input = container.querySelector('input[type="file"]')

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText('Exakte Treffer')).toBeInTheDocument()
      expect(screen.getByText('RE-2026-201')).toBeInTheDocument()
      expect(screen.getByText('Beatrix Brunner')).toBeInTheDocument()
      expect(screen.getByText(/1 Rechnung verbuchen/i)).toBeInTheDocument()
    })
  })
})
