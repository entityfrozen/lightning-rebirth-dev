/*
 * Celestial Browser V2: a small, predictable Scramjet 2.x entry point.
 * The server serves pinned runtime packages. Only the chosen Wisp transport
 * is downloaded; a new transport can be selected without another worker.
 */
(() => {
  'use strict';

  const paths = Object.freeze({
    worker: '/sw.js',
    runtime: '/v2/scram/scramjet.js',
    controller: '/v2/controller/controller.api.js',
    utils: '/v2/utils/scramjet-utils.js',
    inject: '/v2/controller/controller.inject.js',
    wasm: '/v2/scram/scramjet.wasm',
    transports: Object.freeze({
      libcurl: '/v2/libcurl/index.mjs',
      epoxy: '/v2/epoxy/index.mjs'
    })
  });
  const scripts = new Map();
  let controllerPromise = null;
  let currentTransport = null;
  let transportQueue = Promise.resolve();
  const status = {stage: 'idle', transport: null, error: null};
  const history = [];

  function report(stage, error = null) {
    status.stage = stage;
    status.transport = currentTransport;
    status.error = error ? String(error.message || error).slice(0, 240) : null;
    history.push({at: new Date().toISOString(), ...status});
    if (history.length > 25) history.shift();
    const stage = { 'registering-worker':'worker-register', 'loading-controller':'controller-script', 'loading-transport':'libcurl', 'handshaking':'controller-ready', 'ready':'controller-ready', 'error':'controller-init' }[stage] || null;
    if (stage) window.dispatchEvent(new CustomEvent('celestial:scramjet-stage', {detail: {stage, outcome: error ? 'error' : status.stage === 'ready' ? 'ok' : 'start'}}));
    window.dispatchEvent(new CustomEvent('celestial:browser-engine', {
      detail: {...status}
    }));
  }

  window.celestialBrowserDiagnostics = () => ({
    ...status,
    history: [...history],
    secure: window.isSecureContext,
    isolated: window.crossOriginIsolated,
    serviceWorker: navigator.serviceWorker?.controller?.state || 'uncontrolled'
  });

  function timeout(promise, task, ms = 20000) {
    let timer;
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(task + ' timed out')), ms);
      })
    ]).finally(() => clearTimeout(timer));
  }

  function loadScript(src) {
    if (scripts.has(src)) return scripts.get(src);
    const promise = timeout(new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = src;
      el.async = false;
      el.onload = resolve;
      el.onerror = () => {
        el.remove();
        reject(new Error('Browser runtime file unavailable: ' + src));
      };
      document.head.append(el);
    }), 'Loading ' + src).catch(error => {
      scripts.delete(src);
      throw error;
    });
    scripts.set(src, promise);
    return promise;
  }

  async function getWorker() {
    if (!window.isSecureContext) throw new Error('Open Celestial over HTTPS.');
    if (!window.crossOriginIsolated) {
      throw new Error('Browser isolation is unavailable. Open Celestial directly in a supported browser tab.');
    }
    if (!('serviceWorker' in navigator)) {
      throw new Error('This browser does not support service workers.');
    }
    report('registering-worker');
    const registration = await timeout(
      navigator.serviceWorker.register(paths.worker, {
        scope: '/',
        type: 'classic',
        updateViaCache: 'none'
      }),
      'Registering browser service worker'
    );
    await timeout(navigator.serviceWorker.ready, 'Activating browser service worker');
    const worker = navigator.serviceWorker.controller || registration.active;
    if (!worker) throw new Error('Browser service worker did not activate.');
    return worker;
  }

  async function buildTransport(kind) {
    if (!Object.hasOwn(paths.transports, kind)) {
      throw new Error('Unknown browser transport: ' + kind);
    }
    report('loading-transport');
    const module = await timeout(
      import(paths.transports[kind]),
      'Loading ' + kind + ' transport',
      30000
    );
    if (typeof module.default !== 'function') {
      throw new Error('Browser transport module is invalid: ' + kind);
    }
    const wisp = (location.protocol === 'https:' ? 'wss:' : 'ws:') +
      '//' + location.host + '/wisp-v2/';
    return new module.default({wisp});
  }

  async function boot(kind) {
    const worker = await getWorker();
    report('loading-controller');
    await loadScript(paths.runtime);
    await loadScript(paths.controller);
    await loadScript(paths.utils);
    const api = window.$scramjetController;
    if (typeof api?.Controller !== 'function') {
      throw new Error('Scramjet V2 controller was not loaded.');
    }
    const transport = await buildTransport(kind);
    report('handshaking');
    const controller = new api.Controller({
      serviceworker: worker,
      transport,
      config: {
        scramjetPath: paths.runtime,
        wasmPath: paths.wasm,
        injectPath: paths.inject
      }
    });
    await timeout(controller.wait(), 'Starting browser engine', 40000);
    currentTransport = kind;
    report('ready');
    return controller;
  }

  // Calling this concurrently from many tabs still creates one controller.
  // Switching is serialized so an older async import cannot win a race.
  window.initBootstrap = async function initBootstrap(kind = 'libcurl') {
    if (!Object.hasOwn(paths.transports, kind)) {
      throw new Error('Unsupported browser transport.');
    }
    if (!controllerPromise) {
      controllerPromise = boot(kind).catch(error => {
        controllerPromise = null;
        currentTransport = null;
        report('error', error);
        throw error;
      });
    }
    const controller = await controllerPromise;
    const change = transportQueue.catch(() => {}).then(async () => {
      if (currentTransport === kind) return;
      const replacement = await buildTransport(kind);
      await controller.setTransport(replacement);
      currentTransport = kind;
      report('ready');
    });
    transportQueue = change;
    try {
      await change;
    } catch (error) {
      report('error', error);
      throw error;
    }
    return controller;
  };
})();
