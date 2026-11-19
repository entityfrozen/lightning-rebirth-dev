// Scramjet V2 adapter. The UI never reaches into transport internals.
let loaderPromise = null;
let keepalive = null;

async function ensureLoader() {
  if (typeof window.initBootstrap === 'function') return;
  if (!loaderPromise) {
    loaderPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/proxy-entry.js';
      script.dataset.celestialBrowser = 'loader';
      script.onload = () => {
        if (typeof window.initBootstrap === 'function') resolve();
        else reject(new Error('Browser bootstrap did not expose its controller.'));
      };
      script.onerror = () => {
        script.remove();
        reject(new Error('Browser bootstrap could not be loaded.'));
      };
      document.head.append(script);
    }).catch(error => {
      loaderPromise = null;
      document.querySelector('script[data-celestial-browser="loader"]')?.remove();
      throw error;
    });
  }
  await loaderPromise;
}

export async function getProxyController(transport = 'libcurl') {
  await ensureLoader();
  const controller = await window.initBootstrap(transport);
  if (typeof controller?.createFrame !== 'function') {
    throw new Error('Scramjet V2 did not finish initializing.');
  }
  // Work around the current upstream service-worker idle routing issue.
  if (!keepalive) {
    keepalive = window.setInterval(() => {
      try { navigator.serviceWorker.controller?.postMessage('keepalive'); }
      catch { /* Worker may be restarting. */ }
    }, 15000);
  }
  return controller;
}

export function getBrowserDiagnostics() {
  return window.celestialBrowserDiagnostics?.() || {
    stage: 'idle',
    transport: null,
    error: null,
    secure: window.isSecureContext,
    isolated: window.crossOriginIsolated,
    serviceWorker: 'uninitialized'
  };
}

export function disposeProxyFrame(frame) {
  if (!frame) return;
  // V2 currently retains frames in its controller; avoid stale references.
  try {
    const frames = frame.controller?.frames;
    if (Array.isArray(frames)) {
      const index = frames.indexOf(frame);
      if (index >= 0) frames.splice(index, 1);
    }
  } catch { /* Best-effort cleanup. */ }
}

export async function createProxyFrame(element, onNavigate, openTab, transport = 'libcurl') {
  const controller = await getProxyController(transport);
  const utils = window.$scramjetUtils;
  const plugins = [];

  if (utils?.HttpCachePlugin) plugins.push(new utils.HttpCachePlugin());
  if (utils?.UrlWatcherPlugin) {
    plugins.push(new utils.UrlWatcherPlugin(url => onNavigate?.(String(url))));
  }
  if (utils?.CatchEscapedLinksPlugin) {
    plugins.push(new utils.CatchEscapedLinksPlugin(url => {
      const href = url?.href || String(url);
      try {
        const parsed = new URL(href);
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
          openTab?.(parsed.href);
        }
      } catch { /* Malformed pop-up URL. */ }
      return new URL('/', location.origin);
    }));
  }
  return controller.createFrame(element, {plugins});
}
