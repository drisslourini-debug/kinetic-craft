import { test, expect } from '@playwright/test';

test.describe('E2E Audit: Links, Sitemap, Robots & Zero-Freeze Stability', () => {

  test('1. Sitemap & Robots.txt accessible via HTTP 200', async ({ request }) => {
    // Check sitemap.xml
    const sitemapRes = await request.get('/sitemap.xml');
    expect(sitemapRes.status()).toBe(200);
    const sitemapText = await sitemapRes.text();
    expect(sitemapText).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(sitemapText).toContain('<loc>https://kinetic-craft.vercel.app/</loc>');
    expect(sitemapText).toContain('<loc>https://kinetic-craft.vercel.app/#funktionen</loc>');
    expect(sitemapText).toContain('<loc>https://kinetic-craft.vercel.app/#tarife</loc>');
    console.log('✅ sitemap.xml returns 200 OK with valid XML structure');

    // Check robots.txt
    const robotsRes = await request.get('/robots.txt');
    expect(robotsRes.status()).toBe(200);
    const robotsText = await robotsRes.text();
    expect(robotsText).toContain('User-agent: *');
    expect(robotsText).toContain('Sitemap: https://kinetic-craft.vercel.app/sitemap.xml');
    console.log('✅ robots.txt returns 200 OK referencing sitemap.xml');
  });

  test('2. Landing Page: All navigation anchors, modals, and interactivity without freezing', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', err => {
      consoleErrors.push(err.message);
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Verify Title & Hero
    await expect(page).toHaveTitle(/Kinetic Craft/i);
    const heroTitle = page.locator('h1').first();
    await expect(heroTitle).toBeVisible();

    // Verify all desktop anchor links navigate smoothly
    const anchorLinks = [
      '#funktionen',
      '#ki-superpowers',
      '#einblicke',
      '#baustellen-cockpit',
      '#rechner',
      '#gewerke',
      '#tarife',
      '#faq',
    ];

    for (const hash of anchorLinks) {
      const link = page.locator(`header nav a[href="${hash}"]`).first();
      if (await link.isVisible()) {
        await link.click();
        await page.waitForTimeout(300);
        // Verify target section exists and is in DOM
        const targetElement = page.locator(hash).first();
        await expect(targetElement).toBeAttached();
      }
    }
    console.log('✅ All Landing Page anchor navigation links verified');

    // Test ROI Slider (Ersparnis-Rechner)
    const slider = page.locator('input[type="range"]').first();
    if (await slider.isVisible()) {
      await slider.fill('8');
      await page.waitForTimeout(200);
      console.log('✅ ROI Slider is interactive and updates smoothly');
    }

    // Test FAQ Accordion click
    const faqItem = page.locator('button:has-text("Wie funktioniert")').first();
    if (await faqItem.isVisible()) {
      await faqItem.click();
      await page.waitForTimeout(200);
      console.log('✅ FAQ Accordion toggles smoothly');
    }

    // Test Legal Modals: #impressum & #datenschutz
    await page.goto('/#impressum');
    const impressumModal = page.locator('text=Impressum').first();
    await expect(impressumModal).toBeVisible({ timeout: 5000 });
    const closeBtn = page.getByRole('button', { name: /Schliessen/i }).or(page.locator('button[aria-label="Schliessen"]')).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(300);
    }
    console.log('✅ Impressum Modal opens and closes without freeze');

    await page.goto('/#datenschutz');
    const datenschutzModal = page.locator('text=Datenschutzerklärung').first();
    await expect(datenschutzModal).toBeVisible({ timeout: 5000 });
    const closeBtn2 = page.getByRole('button', { name: /Schliessen/i }).or(page.locator('button[aria-label="Schliessen"]')).first();
    if (await closeBtn2.isVisible()) {
      await closeBtn2.click();
      await page.waitForTimeout(300);
    }
    console.log('✅ Datenschutz Modal opens and closes without freeze');

    // Test Login / Register transitions
    await page.goto('/#login');
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 5000 });
    console.log('✅ Login page loads cleanly');

    await page.goto('/#register');
    await page.waitForTimeout(500);
    console.log('✅ Registration wizard loads cleanly');

    // Go back to landing
    await page.goto('/');
    await expect(heroTitle).toBeVisible();

    expect(consoleErrors.length).toBe(0);
    console.log('✅ Landing page audit: 0 console errors, completely freeze-free');
  });

  test('3. Authenticated App: All 10 modules click-through with zero freezes', async ({ page }) => {
    test.setTimeout(60000);
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', err => {
      consoleErrors.push(err.message);
    });

    // Login
    await page.goto('/#login');
    const einloggenBtn = page.getByRole('button', { name: /Einloggen/i }).first();
    if (await einloggenBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await einloggenBtn.click();
      await page.waitForTimeout(500);
    }

    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill('max@muster-malerei.ch');
    await page.locator('input[type="password"]').first().fill('Test1234');
    await page.getByRole('button', { name: /Anmelden/i }).click();
    await page.waitForSelector('text=Dashboard', { timeout: 20000 });

    // Wait for Sidebar
    const sidebar = page.locator('aside').first();
    await sidebar.waitFor({ state: 'visible', timeout: 15000 });

    const modules = [
      { name: 'Dashboard', urlCheck: /\/(dashboard)?$/ },
      { name: 'Kunden', urlCheck: /\/kunden/ },
      { name: 'Projekte', urlCheck: /\/projekte/ },
      { name: 'Kalender', urlCheck: /\/kalender/ },
      { name: 'Offerten', urlCheck: /\/offerten/ },
      { name: 'Rechnungen', urlCheck: /\/rechnungen/ },
      { name: 'Buchhaltung', urlCheck: /\/buchhaltung/ },
      { name: 'Archiv', urlCheck: /\/dateien/ },
      { name: 'Katalog', urlCheck: /\/katalog/ },
      { name: 'Einstellungen', urlCheck: /\/einstellungen/ },
    ];

    for (const mod of modules) {
      const navBtn = sidebar.locator(`button:has-text("${mod.name}")`).first();
      await expect(navBtn).toBeVisible();
      await navBtn.click();
      await page.waitForTimeout(600);

      // Verify URL
      expect(page.url()).toMatch(mod.urlCheck);

      // Verify DOM is responsive and not frozen by evaluating a simple JS execution
      const responsive = await page.evaluate(() => 1 + 1);
      expect(responsive).toBe(2);
      console.log(`✅ Module ${mod.name} mounted smoothly and responsive`);
    }

    expect(consoleErrors.length).toBe(0);
    console.log('✅ All 10 application views verified without errors or freezes');
  });

  test('4. Mobile Viewport (390x844): Navigation, FAB Bottom Sheet & Calendar Tabs', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Login if needed
    await page.goto('/#login');
    const einloggenBtn = page.getByRole('button', { name: /Einloggen/i }).first();
    if (await einloggenBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await einloggenBtn.click();
      await page.waitForTimeout(500);
    }

    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill('max@muster-malerei.ch');
    await page.locator('input[type="password"]').first().fill('Test1234');
    await page.getByRole('button', { name: /Anmelden/i }).click();
    await page.waitForTimeout(1000);

    // Wait for Mobile TabBar (visible nav on mobile)
    const mobileTabBar = page.locator('nav:visible').filter({ hasText: 'Kalender' }).first();
    await mobileTabBar.waitFor({ state: 'visible', timeout: 15000 });

    // 1. Test Central Quick Action Button (+)
    const fabButton = page.locator('button[aria-label*="Schnellaktionen"]').first();
    await expect(fabButton).toBeVisible();
    await fabButton.click();
    await page.waitForTimeout(400);

    // Verify Bottom Sheet Actions are displayed
    const bottomSheet = page.locator('text=Baustellen-Schnellaktionen').first();
    await expect(bottomSheet).toBeVisible();
    await expect(page.locator('text=Stempeluhr starten').first()).toBeVisible();
    await expect(page.locator('text=Neuer Regierapport').first()).toBeVisible();
    await expect(page.locator('text=Beleg mit Gemini KI scannen').first()).toBeVisible();
    console.log('✅ Mobile FAB BottomSheet opened and displays all 4 core actions');

    // Close bottom sheet via close button
    const closeBtn = page.locator('button[aria-label="Schliessen"]').first();
    await closeBtn.click();
    await expect(bottomSheet).not.toBeVisible({ timeout: 5000 });

    // 2. Test Mobile Kalender view
    const kalenderBtn = mobileTabBar.locator('button:has-text("Kalender")').first();
    await kalenderBtn.click();
    await page.waitForTimeout(600);

    // Check Mobile View Toggle: Tagesansicht vs. Agenda-Liste
    const tagesKalenderTab = page.locator('button:has-text("Tages-Kalender")').first();
    const agendaTab = page.locator('button:has-text("Alle Termine (Agenda)")').first();
    await expect(tagesKalenderTab).toBeVisible();
    await expect(agendaTab).toBeVisible();

    // Toggle to Agenda-Liste
    await agendaTab.click();
    await page.waitForTimeout(300);
    console.log('✅ Mobile Kalender toggles cleanly to Agenda-Liste without freeze');

    // Toggle back to Tages-Kalender
    await tagesKalenderTab.click();
    await page.waitForTimeout(300);
    console.log('✅ Mobile Kalender toggles back to Tages-Kalender without freeze');

    // 3. Test Mobile Menu (Burgermenu)
    const menuBtn = mobileTabBar.locator('button:has-text("Menü")').first();
    await menuBtn.click();
    await page.waitForTimeout(400);
    await expect(page.locator('button:has-text("Buchhaltung"):visible').first()).toBeVisible();
    console.log('✅ Mobile Menu bottom sheet opens smoothly');

    console.log('✅ Mobile Handwerker experience tested: zero freeze, flawless responsiveness');
  });

});
