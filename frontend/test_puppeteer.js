import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  await page.goto('http://localhost:1234');
  await page.evaluate(() => {
    localStorage.setItem('user', JSON.stringify({
        'role_name': 'Professional Society',
        'department_name': 'Association for Computing Machinery (ACM)',
        'name': 'Association for Computing Machinery (ACM)',
        'registration_code': 'CU2026/PROF/SOC/101'
    }));
  });
  
  await page.goto('http://localhost:1234/professional-dashboard');
  await new Promise(r => setTimeout(r, 5000));
  await browser.close();
})();
