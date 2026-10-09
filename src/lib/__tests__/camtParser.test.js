import { describe, it, expect } from 'vitest'
import { parseCamtXml, getElementsByLocalName, normalizeDate } from '../camtParser'

describe('camtParser', () => {
  const sampleCamt054Xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.054.001.02">
  <BkToCstmrDbtCdtNtfctn>
    <GrpHdr>
      <MsgId>MSG-20261004-001</MsgId>
      <CreDtTm>2026-10-04T08:30:00</CreDtTm>
    </GrpHdr>
    <Ntfctn>
      <Id>NTF-001</Id>
      <Acct>
        <Id>
          <IBAN>CH3909000000123456789</IBAN>
        </Id>
      </Acct>
      <Ntry>
        <Amt Ccy="CHF">4772.62</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts>BOOK</Sts>
        <BookgDt>
          <Dt>2026-10-04</Dt>
        </BookgDt>
        <NtryDtls>
          <TxDtls>
            <Refs>
              <EndToEndId>E2E-998877</EndToEndId>
              <AcctSvcrRef>BANK-TX-1001</AcctSvcrRef>
            </Refs>
            <Amt Ccy="CHF">4772.62</Amt>
            <RltdPties>
              <Dbtr>
                <Nm>Hans Muster</Nm>
              </Dbtr>
            </RltdPties>
            <RmtInf>
              <Strd>
                <CdtrRefInf>
                  <Tp>
                    <CdOrPrtry>
                      <Cd>QRR</Cd>
                    </CdOrPrtry>
                  </Tp>
                  <Ref>210000000000000000000001017</Ref>
                </CdtrRefInf>
              </Strd>
              <Ustrd>Rechnung 1010 Renovation</Ustrd>
            </RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>
      <Ntry>
        <Amt Ccy="CHF">250.00</Amt>
        <CdtDbtInd>DBIT</CdtDbtInd>
        <BookgDt><Dt>2026-10-04</Dt></BookgDt>
      </Ntry>
    </Ntfctn>
  </BkToCstmrDbtCdtNtfctn>
</Document>`

  it('correctly parses camt.054 XML with structured QR reference and filters out DBIT', () => {
    const result = parseCamtXml(sampleCamt054Xml)
    expect(result.success).toBe(true)
    expect(result.type).toBe('camt.054')
    expect(result.messageId).toBe('MSG-20261004-001')
    expect(result.iban).toBe('CH3909000000123456789')
    expect(result.transactions).toHaveLength(1) // DBIT filtered out

    const tx = result.transactions[0]
    expect(tx.betrag).toBe(4772.62)
    expect(tx.waehrung).toBe('CHF')
    expect(tx.datum).toBe('2026-10-04')
    expect(tx.transaktionsId).toBe('E2E-998877')
    expect(tx.qrReferenz).toBe('210000000000000000000001017')
    expect(tx.einzahler).toBe('Hans Muster')
    expect(tx.mitteilung).toBe('Rechnung 1010 Renovation')
  })

  it('handles camt.053 bank statement with multiple transactions', () => {
    const sampleCamt053Xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.04">
  <BkToCstmrStmt>
    <GrpHdr><MsgId>STMT-2026-09</MsgId></GrpHdr>
    <Stmt>
      <Ntry>
        <Amt Ccy="CHF">1200.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <BookgDt><Dt>2026-10-03</Dt></BookgDt>
        <NtryDtls>
          <TxDtls>
            <Refs><AcctSvcrRef>REF-777</AcctSvcrRef></Refs>
            <Amt Ccy="CHF">1200.00</Amt>
            <RmtInf>
              <Ustrd>Zahlung RE-2026-1002 Malerei</Ustrd>
            </RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>
    </Stmt>
  </BkToCstmrStmt>
</Document>`

    const result = parseCamtXml(sampleCamt053Xml)
    expect(result.success).toBe(true)
    expect(result.type).toBe('camt.053')
    expect(result.transactions).toHaveLength(1)
    expect(result.transactions[0].betrag).toBe(1200.00)
    expect(result.transactions[0].mitteilung).toBe('Zahlung RE-2026-1002 Malerei')
  })

  it('returns clean error message for malformed XML or empty string', () => {
    const emptyRes = parseCamtXml('')
    expect(emptyRes.success).toBe(false)
    expect(emptyRes.error).toBeDefined()

    const malformedRes = parseCamtXml('<Document><UnclosedTag>')
    expect(malformedRes.success).toBe(false)
  })

  it('normalizes dates correctly', () => {
    expect(normalizeDate('2026-10-04T14:22:10Z')).toBe('2026-10-04')
    expect(normalizeDate('2026-10-04')).toBe('2026-10-04')
  })
})
