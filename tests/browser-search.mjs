import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

const url = process.env.TRASH_TEST_URL || 'https://borbag.github.io/trash-lookup/';
const locale = process.env.TRASH_TEST_LOCALE || 'en-US';
const mobile = locale === 'de-DE';
const screenshotDirectory = process.env.TRASH_TEST_SCREENSHOTS;
const mode = process.env.TRASH_TEST_MODE || 'verify';
const cases = [
  ['Candy wrapper', 'What is the wrapper made of'],
  ['Snickers wrapper', 'What is the wrapper made of'],
  ['Chip bag', 'What is the wrapper made of'],
  ['Capri-Sun pouch', 'Gelber Sack'],
  ['Used paper towel', 'Biotonne'],
  ['Juice box', 'Gelber Sack'],
  ['Gum wrapper', 'What is the wrapper made of'],
  ['Plastic straw', 'Restmüll'],
  ['Broken LEGO', 'Restmüll'],
  ['Empty toothpaste tube', 'Gelber Sack']
];

const profile = process.env.TRASH_TEST_PROFILE || await mkdtemp(join(tmpdir(), 'trash-browser-'));
const edge = spawn(process.env.TRASH_TEST_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', '--lang=' + locale, '--accept-lang=' + locale, '--user-data-dir=' + profile, 'about:blank'
], { stdio: ['ignore', 'ignore', 'pipe'] });

let socket;
try {
  let tabs;
  for (let i = 0; i < 80 && !tabs; i++) {
    await new Promise(resolve => setTimeout(resolve, 125));
    try {
      const port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0];
      tabs = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
    } catch {
      // A saved profile can still hold the port from its previous session.
    }
  }
  assert.ok(tabs, 'Edge debugger started');
  socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  const errors = [];
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry.text);
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map(arg => arg.value).join(' '));
    if (message.id) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const js = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception.description);
    return result.result.value;
  };
  const wait = async expression => {
    for (let i = 0; i < 80; i++) {
      if (await js(expression)) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Timed out: ' + expression);
  };
  const requests = [];
  const workers = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Network.responseReceived') {
      const { response } = message.params;
      if (response.url.startsWith(url)) requests.push({
        url: response.url, status: response.status, fromServiceWorker: response.fromServiceWorker
      });
    }
    if (message.method === 'ServiceWorker.workerVersionUpdated') {
      for (const version of message.params.versions) workers.set(version.versionId, version);
    }
    if (message.method === 'Network.loadingFailed' && !message.params.canceled) {
      errors.push(message.params.errorText);
    }
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Network.enable');
  await send('ServiceWorker.enable');
  await send('Emulation.setLocaleOverride', { locale });
  await send('Network.setUserAgentOverride', {
    userAgent: await js('navigator.userAgent'),
    acceptLanguage: locale
  });
  await send('Emulation.setDeviceMetricsOverride', {
    width: mobile ? 390 : 1280, height: mobile ? 844 : 850, deviceScaleFactor: 1, mobile
  });
  await send('Page.navigate', { url });
  await wait('document.querySelector("#content")?.innerText.includes("Bin quick guide")');
  await wait('Boolean(navigator.serviceWorker.controller)');

  async function snapshot() {
    return js('Promise.all([caches.keys(), navigator.serviceWorker.getRegistration().then(r => ({scope:r.scope,active:r.active?.scriptURL,waiting:r.waiting?.scriptURL,controller:navigator.serviceWorker.controller?.scriptURL})), Promise.all(["data/waste-items.json","search.js","app.js"].map(async path=>{const response=await fetch(path);const bytes=await response.text();const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(bytes));return {path,status:response.status,sha256:Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,"0")).join(""),database:path.endsWith(".json")?{updated:JSON.parse(bytes).updated_at,items:JSON.parse(bytes).items.length}:undefined}})),navigator.language,navigator.languages])');
  }

  async function searches(label, screenshots = true) {
    const results = [];
    if (screenshotDirectory && screenshots) await mkdir(screenshotDirectory, { recursive: true });
    for (const [index, [query, expected]] of cases.entries()) {
      const coords = await js('(()=>{const r=document.querySelector("#query").getBoundingClientRect();return {x:r.left+40,y:r.top+r.height/2}})()');
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...coords, button: 'left', clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...coords, button: 'left', clickCount: 1 });
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 });
      await send('Input.insertText', { text: query });
      const observed = await js('({value:document.querySelector("#query").value,text:document.querySelector("#content").innerText,visible:document.querySelector("#query").getBoundingClientRect().width>0})');
      assert.equal(observed.value, query);
      assert.equal(observed.visible, true);
      if (screenshotDirectory && screenshots) {
        const screenshot = await send('Page.captureScreenshot', {format:'png'});
        await writeFile(join(screenshotDirectory, label + '-' + String(index + 1).padStart(2, '0') + '.png'), Buffer.from(screenshot.data, 'base64'));
      }
      const result = {query, expected, text:observed.text};
      results.push(result);
      if (label !== 'before') assert.ok(observed.text.includes(expected), JSON.stringify(result));
    }
    return results;
  }

  const before = await snapshot();
  const results = await searches(mode === 'baseline' || mode === 'upgrade' ? 'before' : 'after');
  if (mode === 'upgrade') {
    assert.ok(before[0].some(key => key.endsWith(':v5')));
    console.error('Public v5 tab is open. Waiting for v6 without closing or reloading it.');
    for (let attempt = 0; attempt < 100; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2500));
      try {
        await js('navigator.serviceWorker.getRegistration().then(r => r.update()).then(() => true)');
        const upgraded = await js('caches.keys().then(keys => keys.some(key => key.endsWith(":v6")) && !keys.some(key => key.endsWith(":v5")))');
        if (upgraded) break;
      } catch {
        // The running document can change while the worker refreshes it.
      }
    }
    await wait('document.querySelector("#content")?.innerText.includes("Bin quick guide")');
    const after = await snapshot();
    assert.ok(after[0].some(key => key.endsWith(':v6')));
    assert.ok(!after[0].some(key => key.endsWith(':v5')));
    const updated = await searches('after');
    await send('Network.emulateNetworkConditions', {offline:true, latency:0, downloadThroughput:0, uploadThroughput:0});
    await send('Page.reload');
    await wait('document.querySelector("#content")?.innerText.includes("Bin quick guide")');
    const offline = await searches('offline', false);
    console.log(JSON.stringify({locale,url,before,after,results,updated,offline,errors,requests,workers:[...workers.values()]},null,2));
    process.exitCode = errors.length ? 1 : 0;
  } else {
    console.log(JSON.stringify({locale, url, before, results, errors, requests, workers:[...workers.values()]},null,2));
    process.exitCode = errors.length ? 1 : 0;
  }
} finally {
  socket?.close();
  edge.kill();
}
