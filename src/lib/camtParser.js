/**
 * Swiss ISO 20022 camt.054 and camt.053 XML Bank Statement Parser
 * 
 * Supports:
 * - camt.054.001.02 / .04 / .08 (Credit notifications, standard for Swiss QR-bill payments)
 * - camt.053.001.02 / .04 / .08 (Bank statements)
 * 
 * Pure JavaScript, client-side capable, runs in Browser DOM and Node/jsdom.
 */

/**
 * Helper to find immediate or nested elements matching a tag name (ignoring XML namespaces).
 * @param {Element|Document} root 
 * @param {string} tagName 
 * @returns {Element[]}
 */
export function getElementsByLocalName(root, tagName) {
  if (!root) return []
  const target = tagName.toLowerCase()
  const results = []
  
  // Recursively or via tree traversal
  const walker = (node) => {
    if (!node || node.nodeType !== 1) return
    const local = (node.localName || node.nodeName || '').toLowerCase()
    // Handle prefixed nodes like "ns:Ntry" or "Ntry"
    const cleanLocal = local.includes(':') ? local.split(':')[1] : local
    if (cleanLocal === target) {
      results.push(node)
    }
    const children = node.children || node.childNodes
    for (let i = 0; i < children.length; i++) {
      if (children[i].nodeType === 1) {
        walker(children[i])
      }
    }
  }

  // If root itself matches and is Element
  if (root.nodeType === 1) {
    const rootLocal = (root.localName || root.nodeName || '').toLowerCase()
    const cleanRoot = rootLocal.includes(':') ? rootLocal.split(':')[1] : rootLocal
    if (cleanRoot === target) {
      results.push(root)
    }
  }

  const children = root.children || root.childNodes || []
  for (let i = 0; i < children.length; i++) {
    if (children[i].nodeType === 1) {
      walker(children[i])
    }
  }

  return results
}

/**
 * Helper to get text content of the first matching child element by localName.
 * @param {Element} node 
 * @param {string} tagName 
 * @returns {string|null}
 */
export function getFirstChildText(node, tagName) {
  if (!node) return null
  const elements = getElementsByLocalName(node, tagName)
  if (elements.length > 0 && elements[0].textContent) {
    return elements[0].textContent.trim()
  }
  return null
}

/**
 * Normalizes date to YYYY-MM-DD format
 * @param {string} dateStr 
 * @returns {string}
 */
export function normalizeDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0]
  // If ISO datetime e.g. 2026-10-04T12:00:00 or 2026-10-04
  return dateStr.split('T')[0].trim()
}

/**
 * Parses raw XML string into a structured object with transactions.
 * @param {string} xmlString 
 * @returns {{
 *   success: boolean,
 *   type: 'camt.054'|'camt.053'|'unknown',
 *   messageId: string|null,
 *   iban: string|null,
 *   totalCreditAmount: number,
 *   transactions: Array<{
 *     id: string,
 *     datum: string,
 *     betrag: number,
 *     waehrung: string,
 *     transaktionsId: string,
 *     qrReferenz: string|null,
 *     einzahler: string|null,
 *     mitteilung: string|null,
 *     rawType: string
 *   }>,
 *   error?: string
 * }}
 */
export function parseCamtXml(xmlString) {
  if (!xmlString || typeof xmlString !== 'string') {
    return {
      success: false,
      type: 'unknown',
      messageId: null,
      iban: null,
      totalCreditAmount: 0,
      transactions: [],
      error: 'Keine XML-Daten übergeben.'
    }
  }

  try {
    let doc
    if (typeof window !== 'undefined' && window.DOMParser) {
      const parser = new window.DOMParser()
      doc = parser.parseFromString(xmlString, 'text/xml')
    } else {
      // Node.js test environment or fallback
      const { JSDOM } = require('jsdom')
      const dom = new JSDOM(xmlString, { contentType: 'text/xml' })
      doc = dom.window.document
    }

    // Check for parse error
    const parseErrors = doc.getElementsByTagName('parsererror')
    if (parseErrors.length > 0) {
      return {
        success: false,
        type: 'unknown',
        messageId: null,
        iban: null,
        totalCreditAmount: 0,
        transactions: [],
        error: 'Die Datei enthält kein gültiges XML Format.'
      }
    }

    // Detect format: camt.054 (BkToCstmrDbtCdtNtfctn) or camt.053 (BkToCstmrStmt)
    const isCamt054 = getElementsByLocalName(doc, 'BkToCstmrDbtCdtNtfctn').length > 0
    const isCamt053 = getElementsByLocalName(doc, 'BkToCstmrStmt').length > 0

    if (!isCamt054 && !isCamt053) {
      // Check if root Document or namespace indicates camt
      const rootStr = xmlString.slice(0, 500).toLowerCase()
      if (!rootStr.includes('camt.054') && !rootStr.includes('camt.053')) {
        return {
          success: false,
          type: 'unknown',
          messageId: null,
          iban: null,
          totalCreditAmount: 0,
          transactions: [],
          error: 'Unbekanntes Dateiformat. Bitte eine Schweizer camt.054 oder camt.053 XML-Datei hochladen.'
        }
      }
    }

    const docType = isCamt054 ? 'camt.054' : (isCamt053 ? 'camt.053' : 'camt.054')

    // Message Header
    const messageId = getFirstChildText(doc, 'MsgId')
    const iban = getFirstChildText(doc, 'IBAN')

    // Find entries (Ntry)
    const entryNodes = getElementsByLocalName(doc, 'Ntry')
    const transactions = []
    let totalCreditAmount = 0
    let counter = 0

    for (const ntry of entryNodes) {
      // Indicator: Credit (CRDT) or Debit (DBIT)
      const cdtDbtInd = (getFirstChildText(ntry, 'CdtDbtInd') || '').toUpperCase()
      // We are reconciling customer invoice receipts -> incoming credits (CRDT)
      if (cdtDbtInd !== 'CRDT') {
        continue
      }

      // Entry booking date
      const bookgDt = getFirstChildText(ntry, 'BookgDt') || getFirstChildText(ntry, 'ValDt')
      const entryDatum = normalizeDate(bookgDt)

      // Entry overall amount & currency
      const amtNodes = getElementsByLocalName(ntry, 'Amt')
      const entryAmtNode = amtNodes[0]
      const entryAmt = entryAmtNode ? parseFloat(entryAmtNode.textContent.trim()) : 0
      const entryCcy = entryAmtNode ? (entryAmtNode.getAttribute('Ccy') || 'CHF') : 'CHF'
      const ntryAcctSvcrRef = getFirstChildText(ntry, 'AcctSvcrRef')

      // Transaction details (TxDtls) inside NtryDtls
      const txDtlsNodes = getElementsByLocalName(ntry, 'TxDtls')

      if (txDtlsNodes.length === 0) {
        // Flat entry without sub-transactions
        counter++
        const txId = ntryAcctSvcrRef || `TX-${counter}-${Date.now()}`
        
        // Scan for reference in unstructured info
        const ustrd = getFirstChildText(ntry, 'Ustrd')
        let qrRef = null
        if (ustrd) {
          const match = ustrd.replace(/\s+/g, '').match(/\d{27}/)
          if (match) qrRef = match[0]
        }

        transactions.push({
          id: `tx_${counter}_${entryDatum}_${entryAmt.toFixed(2)}`,
          datum: entryDatum,
          betrag: Math.round(entryAmt * 100) / 100,
          waehrung: entryCcy,
          transaktionsId: txId,
          qrReferenz: qrRef,
          einzahler: getFirstChildText(ntry, 'Nm'),
          mitteilung: ustrd,
          rawType: 'single_entry'
        })
        totalCreditAmount += entryAmt
      } else {
        // Loop through individual transaction details
        for (const tx of txDtlsNodes) {
          counter++

          // Transaction specific amount or fallback to entry amount
          const txAmtNodes = getElementsByLocalName(tx, 'Amt')
          const txAmtNode = txAmtNodes[0] || entryAmtNode
          const betrag = txAmtNode ? parseFloat(txAmtNode.textContent.trim()) : entryAmt
          const waehrung = txAmtNode?.getAttribute('Ccy') || entryCcy

          // Transaction references
          const endToEndId = getFirstChildText(tx, 'EndToEndId')
          const txAcctSvcrRef = getFirstChildText(tx, 'AcctSvcrRef') || ntryAcctSvcrRef
          const txId = (endToEndId && endToEndId !== 'NOTPROVIDED') ? endToEndId : (txAcctSvcrRef || `TX-${counter}-${Date.now()}`)

          // Debtor / Einzahler Name
          const dbtrNodes = getElementsByLocalName(tx, 'Dbtr')
          let einzahler = null
          if (dbtrNodes.length > 0) {
            einzahler = getFirstChildText(dbtrNodes[0], 'Nm')
          }
          if (!einzahler) {
            const rltdPties = getElementsByLocalName(tx, 'RltdPties')
            if (rltdPties.length > 0) {
              einzahler = getFirstChildText(rltdPties[0], 'Nm')
            }
          }

          // Remittance Info: Structured (QR Reference) and Unstructured
          let qrReferenz = null
          const rmtInfNodes = getElementsByLocalName(tx, 'RmtInf')
          let mitteilung = null

          if (rmtInfNodes.length > 0) {
            const rmt = rmtInfNodes[0]
            mitteilung = getFirstChildText(rmt, 'Ustrd')

            // Look for structured QR reference: CdtrRefInf -> Ref
            const cdtrRefNodes = getElementsByLocalName(rmt, 'CdtrRefInf')
            if (cdtrRefNodes.length > 0) {
              const rawRef = getFirstChildText(cdtrRefNodes[0], 'Ref')
              if (rawRef) {
                // Strip spaces
                qrReferenz = rawRef.replace(/\s+/g, '')
              }
            }

            // Fallback: If not found in CdtrRefInf, check if Ustrd contains a 27-digit or 26-digit QR Reference
            if (!qrReferenz && mitteilung) {
              const cleanText = mitteilung.replace(/\s+/g, '')
              const qrrMatch = cleanText.match(/\b\d{27}\b/) || cleanText.match(/(\d{27})/)
              if (qrrMatch) {
                qrReferenz = qrrMatch[1] || qrrMatch[0]
              }
            }
          }

          // Transaction specific date if present
          const txDt = getFirstChildText(tx, 'BookgDt') || getFirstChildText(tx, 'ValDt')
          const txDatum = txDt ? normalizeDate(txDt) : entryDatum

          transactions.push({
            id: `tx_${counter}_${txDatum}_${betrag.toFixed(2)}`,
            datum: txDatum,
            betrag: Math.round(betrag * 100) / 100,
            waehrung,
            transaktionsId: txId,
            qrReferenz,
            einzahler,
            mitteilung,
            rawType: 'tx_detail'
          })
          totalCreditAmount += betrag
        }
      }
    }

    return {
      success: true,
      type: docType,
      messageId,
      iban,
      totalCreditAmount: Math.round(totalCreditAmount * 100) / 100,
      transactions
    }
  } catch (err) {
    return {
      success: false,
      type: 'unknown',
      messageId: null,
      iban: null,
      totalCreditAmount: 0,
      transactions: [],
      error: `Fehler beim Einlesen der XML-Datei: ${err.message}`
    }
  }
}
