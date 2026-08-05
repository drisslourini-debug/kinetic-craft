const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  console.log('Navigating to bypass auth...');
  await page.goto('http://localhost:5173/?testBypass=true', { waitUntil: 'networkidle0' });
  
  console.log('Clicking Offerten...');
  // Find the button containing 'Offerten'
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, a, div'));
    const offertenBtn = buttons.find(b => b.textContent && b.textContent.includes('Offerten') && b.onclick);
    if (offertenBtn) {
       offertenBtn.click();
    } else {
       // if it's a div acting as a button in Sidebar
       const sidebarItems = Array.from(document.querySelectorAll('.cursor-pointer'));
       const item = sidebarItems.find(b => b.textContent && b.textContent.includes('Offerten'));
       if (item) item.click();
    }
  });

  // wait for render
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Evaluating React Root...');
  const html = await page.evaluate(() => document.body.innerHTML);
  if (html.includes('vite-error-overlay')) {
    console.log('VITE ERROR FOUND');
  } else if (html.trim() === '' || html.includes('<noscript>')) {
    console.log('WHITE SCREEN DETECTED');
  } else {
    console.log('PAGE LOADED SUCCESSFULLY (at least not white)');
  }
  
  await browser.close();
})();
