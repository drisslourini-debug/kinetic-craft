const puppeteer = require('puppeteer');
(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
    
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    
    await new Promise(r => setTimeout(r, 1000));
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('button, a, div'));
      const rechnungenBtn = items.find(b => b.textContent && b.textContent.includes('Rechnungen'));
      if (rechnungenBtn) rechnungenBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    await browser.close();
  } catch (err) {
    console.error(err);
  }
})();
