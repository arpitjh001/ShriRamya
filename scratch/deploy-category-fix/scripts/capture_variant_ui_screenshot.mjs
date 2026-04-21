import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import puppeteer from 'puppeteer';

const base = 'http://localhost:8080';

const request = async (method, url, body = null) => {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  return { ok: res.ok, status: res.status, body: parsed };
};

const main = async () => {
  const seed = Math.floor(Date.now() / 1000);
  const email = `ui.capture.${seed}@example.com`;
  const password = 'AdminPass123!';

  await request('POST', `${base}/api/v1/auth/register`, {
    email,
    password,
    name: 'UI Capture Admin',
    phone: '9999999999',
  });
  const loginRes = await request('POST', `${base}/api/v1/auth/login`, { email, password });
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${JSON.stringify(loginRes)}`);
  }

  const token = loginRes.body?.data?.access_token;
  if (!token) {
    throw new Error('Token missing from login response');
  }

  const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'variant-ui-capture-'));
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: edgePath,
    userDataDir,
    defaultViewport: { width: 1800, height: 1200 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument((authToken) => {
      localStorage.setItem('token', authToken);
    }, token);

    await page.goto(`${base}/admin/dashboard`, { waitUntil: 'networkidle2', timeout: 120000 });
    await page.waitForSelector('button', { timeout: 120000 });

    const clickButtonByText = async (text) => {
      const clicked = await page.evaluate((label) => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const match = buttons.find((btn) => (btn.textContent || '').includes(label));
        if (match) {
          match.click();
          return true;
        }
        return false;
      }, text);
      if (!clicked) throw new Error(`${text} button not found`);
    };

    await clickButtonByText('+ Add Product');

    await page.waitForFunction(() => {
      const headings = Array.from(document.querySelectorAll('h3'));
      return headings.some((h) => {
        const text = h.textContent || '';
        return text.includes('New Product') || text.includes('Edit Product');
      });
    }, { timeout: 60000 });

    await clickButtonByText('+ Add Variant');
    await clickButtonByText('+ Add Variant');

    await new Promise((resolve) => setTimeout(resolve, 1200));

    await fs.mkdir('docs/screenshots', { recursive: true });
    const screenshotPath = path.resolve('docs/screenshots/admin-variant-table.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved screenshot: ${screenshotPath}`);
  } finally {
    await browser.close();
    await fs.rm(userDataDir, { recursive: true, force: true });
  }
};

main().catch((error) => {
  console.error(`CAPTURE_FAILED: ${error.message}`);
  process.exit(1);
});
