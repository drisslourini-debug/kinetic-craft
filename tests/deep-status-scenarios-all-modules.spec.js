import { test, expect } from '@playwright/test'
import path from 'path'

const ARTIFACT_DIR = 'C:/Users/Amin/.gemini/antigravity/brain/b175e108-b5b2-4fe1-8eb9-d6f67b38b7e1'

async function loginFlorence(page) {
  await page.goto('/#login')
  await page.waitForLoadState('networkidle')
  const emailInput = page.locator('input[type="email"]').first()
  await emailInput.waitFor({ state: 'visible', timeout: 10000 })
  await emailInput.fill('lourini@bluewin.ch')
  const passwordInput = page.locator('input[type="password"]').first()
  await passwordInput.fill('FloArt2026!')
  await page.getByRole('button', { name: /Anmelden/i }).click()
  await page.waitForSelector('text=Flo Art', { timeout: 15000 })
}

async function ensureActiveTenant(page, targetName) {
  const isTargetAlready = await page.locator('header, aside').filter({ hasText: targetName }).first().isVisible()
  if (isTargetAlready) return

  const switcherBtn = page.getByTitle('Betrieb / Standort wechseln').first()
  if (await switcherBtn.isVisible()) {
    await switcherBtn.click()
    await page.waitForTimeout(600)

    const targetOption = page.locator('button:visible').filter({ hasText: targetName }).last()
    await targetOption.click()
    await page.waitForTimeout(1500)
  }
}

test.describe('Tiefgründiger Status- & Revisions-Audit über alle Module', () => {
  test.setTimeout(120000)

  test('Vollständiges Durchspielen aller Status-Zustände, Sperren, Teilzahlungen, Skonto & Storno', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 })
    await loginFlorence(page)

    // 1. Betrieb Flo Art – Polsterei aktivieren
    console.log('1. Flo Art – Polsterei aktivieren...')
    await ensureActiveTenant(page, 'Flo Art – Polsterei')

    // ==========================================
    // SZENARIO 1: Offerten Revisions- und Sperr-Zyklus
    // ==========================================
    console.log('SZENARIO 1: Offerten-Statuswechsel & Revisionssperre...')
    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Offerten' }).first().click()
    await page.waitForTimeout(1000)

    // Neue Offerte erstellen
    const neueOfferteBtn = page.locator('button:visible').filter({ hasText: 'Neue Offerte erstellen' }).first()
    await expect(neueOfferteBtn).toBeVisible({ timeout: 10000 })
    await neueOfferteBtn.click()
    await page.waitForTimeout(800)

    // Kunde wählen (Beat von Graffenried)
    const kundeSelect = page.locator('div.fixed select:visible').first()
    const kundeOpt = kundeSelect.locator('option').filter({ hasText: /Beat|Graffenried/i }).first()
    await kundeOpt.waitFor({ state: 'attached', timeout: 10000 })
    const kundeOptVal = await kundeOpt.getAttribute('value')
    if (kundeOptVal) {
      await kundeSelect.selectOption(kundeOptVal)
    }
    await page.waitForTimeout(400)

    // Weiter zum Editor
    const weiterBtn = page.locator('button:visible').filter({ hasText: 'Weiter zum Editor' }).first()
    await expect(weiterBtn).toBeEnabled({ timeout: 10000 })
    await weiterBtn.click()
    await page.waitForTimeout(1500)

    // Artikel / Position hinzufügen, damit die Offerte einen echten Totalbetrag hat
    console.log('1.0 Position mit Betrag hinzufügen...')
    const addPosBtn = page.locator('button:visible').filter({ hasText: /^Position$/ }).first()
    if (await addPosBtn.isVisible()) {
      await addPosBtn.click()
      await page.waitForTimeout(500)

      const descInput = page.locator('input[placeholder*="z.B. Decke streichen"]').first()
      await descInput.fill('Neupolsterung & Restauration Art Déco Sessel')

      const mengeInput = page.locator('input[placeholder="0"]:visible').first()
      if (await mengeInput.isVisible()) {
        await mengeInput.fill('1')
      }

      const einzelpreisInput = page.locator('input[placeholder="0.00"]').first()
      await einzelpreisInput.fill('1200.00')
      await page.waitForTimeout(300)

      const addBtn = page.locator('button:visible').filter({ hasText: 'Hinzufügen' }).first()
      await addBtn.click()
      await page.waitForTimeout(800)
    }

    // Speichere Draft, um den initialen Editiermodus zu beenden
    const saveDraftBtn = page.locator('button:visible').filter({ hasText: 'Änderungen speichern' }).first()
    if (await saveDraftBtn.isVisible()) {
      await saveDraftBtn.click()
      await page.waitForTimeout(1500)
    }

    const offerteStatusSelect = page.locator('select').filter({ has: page.locator('option[value="Entwurf"]') }).first()
    await expect(offerteStatusSelect).toBeVisible({ timeout: 10000 })
    await expect(offerteStatusSelect).toHaveValue('Entwurf')

    // 1.1 Status auf "Versendet" setzen -> Sperre prüfen
    console.log('1.1 Offerte auf "Versendet" setzen...')
    await offerteStatusSelect.selectOption('Versendet')
    await page.waitForTimeout(1000)

    // Verifiziere Versendet-Banner und Revision-Button
    const versendetBanner = page.locator('text=Offerte an Kunden versendet').first()
    await expect(versendetBanner).toBeVisible({ timeout: 5000 })
    const revisionBtn = page.locator('button:visible').filter({ hasText: /Revision starten/i }).first()
    await expect(revisionBtn).toBeVisible()

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_deep_01_offerte_versendet_locked.png') })
    console.log('📸 Screenshot gespeichert: e2e_deep_01_offerte_versendet_locked.png')

    // 1.2 "Revision starten" anklicken -> Status springt automatisch auf "In Überarbeitung"
    console.log('1.2 "Revision starten" ausführen...')
    await revisionBtn.click()
    await page.waitForTimeout(1000)
    await expect(offerteStatusSelect).toHaveValue('In Überarbeitung')

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_deep_02_offerte_in_ueberarbeitung.png') })
    console.log('📸 Screenshot gespeichert: e2e_deep_02_offerte_in_ueberarbeitung.png')

    // 1.3 Auf "Akzeptiert" setzen -> Umwandlungsbutton erscheint
    console.log('1.3 Offerte auf "Akzeptiert" setzen...')
    await offerteStatusSelect.selectOption('Akzeptiert')
    await page.waitForTimeout(1000)

    const rechnungErstellenBtn = page.locator('button:visible').filter({ hasText: 'Rechnung erstellen' }).first()
    await expect(rechnungErstellenBtn).toBeVisible()

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_deep_03_offerte_akzeptiert.png') })
    console.log('📸 Screenshot gespeichert: e2e_deep_03_offerte_akzeptiert.png')

    // 1.4 In Rechnung umwandeln
    console.log('1.4 Offerte in Rechnung überführen...')
    await rechnungErstellenBtn.click()
    await page.waitForTimeout(800)

    const confirmConvertModalBtn = page.locator('div.fixed button:visible').filter({ hasText: 'Rechnung erstellen' }).last()
    await expect(confirmConvertModalBtn).toBeVisible()
    await confirmConvertModalBtn.click()
    await page.waitForTimeout(3000)

    // Wir sind nun in der neu erstellten Rechnung
    await expect(page.locator('h2:visible').filter({ hasText: /Rechnung/i })).toBeVisible({ timeout: 10000 })

    // Zurück zu den Offerten navigieren und prüfen, ob die Offerte jetzt "Verrechnet" ist
    console.log('1.5 Prüfen, dass Ursprungs-Offerte als "Verrechnet" permanent gesperrt ist...')
    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Offerten' }).first().click()
    await page.waitForTimeout(1500)

    // Öffne die oberste Offerte in der Liste
    const firstOfferteRow = page.locator('div[class*="divide-y"] > div.cursor-pointer').first()
    await expect(firstOfferteRow).toBeVisible({ timeout: 10000 })
    await firstOfferteRow.click()
    await page.waitForTimeout(1500)

    // Prüfe Verrechnet Banner & Sperre
    const verrechnetBanner = page.locator('text=Offerte verrechnet (dauerhaft gesperrt)').first()
    await expect(verrechnetBanner).toBeVisible({ timeout: 5000 })
    await expect(offerteStatusSelect).toBeDisabled()

    const zurRechnungBtn = page.getByRole('button', { name: /Zur Rechnung wechseln/i }).first()
    await expect(zurRechnungBtn).toBeVisible()

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_deep_04_offerte_verrechnet_locked.png') })
    console.log('📸 Screenshot gespeichert: e2e_deep_04_offerte_verrechnet_locked.png')

    // Klick auf "Zur Rechnung wechseln" leitet direkt zur Rechnung weiter!
    await zurRechnungBtn.click()
    await page.waitForTimeout(2000)
    await expect(page.locator('h2:visible').filter({ hasText: /Rechnung/i })).toBeVisible({ timeout: 10000 })

    // ==========================================
    // SZENARIO 2: Rechnungs-Teilzahlung & Status "Teilbezahlt"
    // ==========================================
    console.log('SZENARIO 2: Teilzahlung erfassen und Statusübergang prüfen...')
    const rechnungStatusSelect = page.locator('select').filter({ has: page.locator('option[value="Versendet"]') }).first()
    await expect(rechnungStatusSelect).toBeVisible()

    // Auf "Versendet" setzen falls noch Entwurf
    const currentVal = await rechnungStatusSelect.inputValue()
    if (currentVal === 'Entwurf') {
      await rechnungStatusSelect.selectOption('Versendet')
      await page.waitForTimeout(1000)
    }

    // Klick auf "Zahlung erfassen"
    const zahlungErfassenBtn = page.locator('button:visible').filter({ hasText: /Zahlung erfassen/i }).first()
    await expect(zahlungErfassenBtn).toBeVisible()
    await zahlungErfassenBtn.click()
    await page.waitForTimeout(600)

    // Zahlung erfassen: Betrag auf 350.00 setzen
    const betragInput = page.locator('input[type="number"]:visible').first()
    await expect(betragInput).toBeVisible()
    await betragInput.fill('350.00')
    await page.waitForTimeout(300)

    // Teilzahlung Radio wählen
    const teilRadio = page.locator('input[type="radio"][value="teil"]').first()
    await expect(teilRadio).toBeVisible()
    await teilRadio.check()
    await page.waitForTimeout(300)

    const paymentSubmitBtn = page.locator('button:visible').filter({ hasText: 'Bestätigen' }).first()
    await paymentSubmitBtn.click()
    await page.waitForTimeout(1500)

    // Prüfe: Status muss jetzt "Teilbezahlt" sein
    await expect(rechnungStatusSelect).toHaveValue('Teilbezahlt')
    // Prüfe, dass Teilzahlung in der Historie / Details erscheint
    await expect(page.locator('text=350.00').first()).toBeVisible()

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_deep_05_rechnung_teilbezahlt.png') })
    console.log('📸 Screenshot gespeichert: e2e_deep_05_rechnung_teilbezahlt.png')

    // ==========================================
    // SZENARIO 3: Restzahlung mit Skonto-Ausbuchung & GeBüV-Sperre
    // ==========================================
    console.log('SZENARIO 3: Restzahlung mit Skonto erfassen & GeBüV-Sperre prüfen...')
    await zahlungErfassenBtn.click()
    await page.waitForTimeout(600)

    // Restbetrag um CHF 20.00 reduzieren, um Skontoabzug zu simulieren
    const curValStr = await betragInput.inputValue()
    const curVal = parseFloat(curValStr) || 100
    const skontoPaymentAmount = Math.max(10, Math.round((curVal - 20) * 100) / 100).toFixed(2)
    await betragInput.fill(skontoPaymentAmount)
    await page.waitForTimeout(300)

    // Skonto Radio anwählen
    const skontoRadio = page.locator('input[type="radio"][value="skonto"]').first()
    await expect(skontoRadio).toBeVisible()
    await skontoRadio.check()
    await page.waitForTimeout(300)

    // Bestätigen
    await paymentSubmitBtn.click()
    await page.waitForTimeout(1500)

    // Prüfe: Status muss jetzt "Bezahlt" sein
    await expect(rechnungStatusSelect).toHaveValue('Bezahlt')
    // Dropdown muss nach GeBüV gesperrt (disabled) sein!
    await expect(rechnungStatusSelect).toBeDisabled()

    // Vollständig bezahlt / ausgeglichen Banner verifizieren
    const bezahltBanner = page.locator('text=Rechnung vollständig ausgeglichen').first()
    await expect(bezahltBanner).toBeVisible({ timeout: 5000 })

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_deep_06_rechnung_bezahlt_locked.png') })
    console.log('📸 Screenshot gespeichert: e2e_deep_06_rechnung_bezahlt_locked.png')

    // ==========================================
    // SZENARIO 4: Stornierung einer versendeten Rechnung nach GeBüV
    // ==========================================
    console.log('SZENARIO 4: Neue Rechnung erstellen und GeBüV-Stornierung prüfen...')
    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Rechnungen' }).first().click()
    await page.waitForTimeout(1200)

    const neueRechnungBtn = page.locator('button:visible').filter({ hasText: 'Neue Rechnung erstellen' }).first()
    await expect(neueRechnungBtn).toBeVisible({ timeout: 10000 })
    await neueRechnungBtn.click()
    await page.waitForTimeout(800)

    // Kunde wählen
    const rKundeSelect = page.locator('div.fixed select:visible').first()
    const rKundeOpt = rKundeSelect.locator('option').filter({ hasText: /Beat|Graffenried/i }).first()
    await rKundeOpt.waitFor({ state: 'attached', timeout: 10000 })
    const rKundeVal = await rKundeOpt.getAttribute('value')
    if (rKundeVal) {
      await rKundeSelect.selectOption(rKundeVal)
    }
    await page.waitForTimeout(400)

    const rWeiterBtn = page.locator('button:visible').filter({ hasText: 'Weiter zum Editor' }).first()
    await rWeiterBtn.click()
    await page.waitForTimeout(1500)

    // Speichere Entwurf zuerst
    const rSaveBtn = page.locator('button:visible').filter({ hasText: 'Änderungen speichern' }).first()
    if (await rSaveBtn.isVisible()) {
      await rSaveBtn.click()
      await page.waitForTimeout(1500)
    }

    const stornoRechnungSelect = page.locator('select').filter({ has: page.locator('option[value="Versendet"]') }).first()
    await expect(stornoRechnungSelect).toBeVisible()

    // Setze auf Versendet
    await stornoRechnungSelect.selectOption('Versendet')
    await page.waitForTimeout(1000)

    // Öffne Aktionsmenü (3 Punkte)
    const actionMenuBtn = page.locator('button[aria-label="Aktionsmenü"]:visible').first()
    await expect(actionMenuBtn).toBeVisible()
    await actionMenuBtn.click()
    await page.waitForTimeout(500)

    // Storno Button muss vorhanden sein
    const stornoBtn = page.locator('button:visible').filter({ hasText: /Rechnung stornieren \(GeBüV\)/i }).first()
    await expect(stornoBtn).toBeVisible()
    await stornoBtn.click()
    await page.waitForTimeout(600)

    // Storno Begründung eingeben
    const stornoInput = page.locator('input[placeholder*="Auftrag widerrufen"]').first()
    await expect(stornoInput).toBeVisible()
    await stornoInput.fill('Kunde hat Projekt storniert - Neubeurteilung nach Schadenfall')
    await page.waitForTimeout(300)

    // Bestätigen
    const confirmStornoBtn = page.locator('button:visible').filter({ hasText: 'Ja, jetzt stornieren' }).first()
    await confirmStornoBtn.click()
    await page.waitForTimeout(1500)

    // Prüfe Storniert-Banner & Sperre
    const storniertBanner = page.locator('text=Rechnung storniert (GeBüV-gesperrt)').first()
    await expect(storniertBanner).toBeVisible({ timeout: 5000 })
    await expect(stornoRechnungSelect).toBeDisabled()

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_deep_08_rechnung_storniert_locked.png') })
    console.log('📸 Screenshot gespeichert: e2e_deep_08_rechnung_storniert_locked.png')

    console.log('🌟 ALLE STATUS-SZENARIEN ERFOLGREICH DURCHGESPIELT UND 100% VERIFIZIERT!')
  })
})
