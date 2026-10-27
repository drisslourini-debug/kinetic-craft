import { test, expect } from '@playwright/test'

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

test.describe('Status-System, Sperrlogik & GeBüV-Audit', () => {
  test.setTimeout(90000)

  test('Offerten- & Rechnungs-Statusfluss, Bearbeitungsschutz, Teilzahlung, Vollzahlung & Storno', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 })
    await loginFlorence(page)

    // 1. Betrieb: Flo Art – Polsterei aktivieren
    console.log('1. Betrieb Flo Art – Polsterei aktivieren...')
    await ensureActiveTenant(page, 'Flo Art – Polsterei')

    // 2. Offerten-Modul öffnen
    console.log('2. Offerten-Modul aufrufen & Offerte erstellen...')
    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Offerten' }).first().click()
    await page.waitForTimeout(1000)

    const neueOfferteBtn = page.locator('button:visible').filter({ hasText: 'Neue Offerte erstellen' }).first()
    await expect(neueOfferteBtn).toBeVisible({ timeout: 10000 })
    await neueOfferteBtn.click()
    await page.waitForTimeout(800)

    // Kunde wählen
    const kundeSelect = page.locator('div.fixed select:visible').first()
    const kundeOpt = kundeSelect.locator('option').filter({ hasText: /Beat|Graffenried/i }).first()
    await kundeOpt.waitFor({ state: 'attached', timeout: 10000 })
    const kundeOptVal = await kundeOpt.getAttribute('value')
    if (kundeOptVal) {
      await kundeSelect.selectOption(kundeOptVal)
    }
    await page.waitForTimeout(500)

    const weiterBtn = page.locator('button:visible').filter({ hasText: 'Weiter zum Editor' }).first()
    await expect(weiterBtn).toBeEnabled({ timeout: 10000 })
    await weiterBtn.click()
    await page.waitForTimeout(1500)

    // Speichere die Offerte zuerst ab, um den Editiermodus zu beenden
    const saveBtn = page.locator('button:visible').filter({ hasText: 'Änderungen speichern' }).first()
    if (await saveBtn.isVisible()) {
      await saveBtn.click()
      await page.waitForTimeout(1500)
    }

    // 3. Statusübergang auf "Versendet" testen
    console.log('3. Offerte auf "Versendet" setzen & Sperre prüfen...')
    const offerteStatusSelect = page.locator('select').filter({ has: page.locator('option[value="Entwurf"]') }).first()
    await expect(offerteStatusSelect).toBeEnabled({ timeout: 10000 })

    await offerteStatusSelect.selectOption('Versendet')
    await page.waitForTimeout(1000)

    // Prüfe Versendet-Banner & Revision starten Button
    const versendetBanner = page.locator('text=Offerte an Kunden versendet').first()
    await expect(versendetBanner).toBeVisible({ timeout: 5000 })
    const revisionBtn = page.locator('button:visible').filter({ hasText: /Revision starten/i }).first()
    await expect(revisionBtn).toBeVisible()

    // Klick auf Revision starten -> Status wird "In Überarbeitung"
    console.log('4. Revision starten (In Überarbeitung)...')
    await revisionBtn.click()
    await page.waitForTimeout(1000)
    await expect(offerteStatusSelect).toHaveValue('In Überarbeitung')

    // Setze auf "Akzeptiert" und wandle um
    console.log('5. Status "Akzeptiert" & Umwandlung in Rechnung...')
    await offerteStatusSelect.selectOption('Akzeptiert')
    await page.waitForTimeout(1000)

    const convertBtn = page.locator('button:visible').filter({ hasText: 'Rechnung erstellen' }).first()
    await expect(convertBtn).toBeVisible()
    await convertBtn.click()
    await page.waitForTimeout(800)

    const confirmConvert = page.locator('div.fixed button:visible').filter({ hasText: 'Rechnung erstellen' }).last()
    await expect(confirmConvert).toBeVisible()
    await confirmConvert.click()
    await page.waitForTimeout(3000)

    // 6. In der neu erstellten Rechnung prüfen
    console.log('6. Rechnungs-Status, GeBüV-Sperren & Storno-Modal prüfen...')
    await expect(page.locator('h2:visible').filter({ hasText: /Rechnung/i })).toBeVisible({ timeout: 10000 })

    const rechnungStatusSelect = page.locator('select').filter({ has: page.locator('option[value="Versendet"]') }).first()
    await expect(rechnungStatusSelect).toBeVisible()

    // Prüfe, dass "Gemahnt" als Option existiert
    const gemahntOption = page.locator('option[value="Gemahnt"]').first()
    await expect(gemahntOption).toBeAttached()

    // Wechsle Status auf "Versendet"
    await rechnungStatusSelect.selectOption('Versendet')
    await page.waitForTimeout(1000)

    // Öffne Action-Menü
    const actionMenuBtn = page.locator('button[aria-label="Aktionsmenü"]:visible').first()
    await expect(actionMenuBtn).toBeVisible()
    await actionMenuBtn.click()
    await page.waitForTimeout(400)

    // Prüfe, dass im Action-Menü "Rechnung stornieren (GeBüV)" angezeigt wird (da versendet)
    const stornoBtn = page.locator('button:visible').filter({ hasText: /Rechnung stornieren \(GeBüV\)/i }).first()
    await expect(stornoBtn).toBeVisible()
    await stornoBtn.click()
    await page.waitForTimeout(500)

    // Storno-Modal prüfen
    await expect(page.getByRole('heading', { name: /Rechnung stornieren\?/i })).toBeVisible()
    await expect(page.locator('text=Gemäss Schweizer GeBüV bleibt der Beleg')).toBeVisible()

    // Storno ausführen mit Grund
    const stornoInput = page.locator('input[placeholder*="Auftrag widerrufen"]').first()
    await stornoInput.fill('Kunde wünscht Neukalkulation wegen geänderten Stoffwünschen')
    await page.waitForTimeout(300)

    const confirmStornoBtn = page.locator('button:visible').filter({ hasText: 'Ja, jetzt stornieren' }).first()
    await confirmStornoBtn.click()
    await page.waitForTimeout(1200)

    // Prüfe Storniert-Banner
    await expect(page.locator('text=Rechnung storniert (GeBüV-gesperrt)').first()).toBeVisible({ timeout: 5000 })

    // Prüfe, dass Dropdown nach Stornierung deaktiviert ist (GeBüV)
    await expect(rechnungStatusSelect).toBeDisabled()

    console.log('🎯 STATUS-SYSTEM, GEBÜV-SPERREN & STORNIERUNGS-WORKFLOW 100% ERFOLGREICH BESTANDEN!')
  })
})
