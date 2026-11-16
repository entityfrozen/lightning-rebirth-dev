/*
 * Celestial's Scramjet bootstrap.
 *
 * proxy-bootstrap 0.0.5 serves a bootstrap-init.js that dynamically imports
 * a data: URI. That import is blocked by our intentionally strict CSP.
 * Load the published controller files directly from our own origin instead.
 *
 * File paths and initialization order match Mercury Workshop's bootstrap
 * 0.0.5 client. Keep this small; errors should surface in the Browser UI.
 */
(() => {
  "use strict";

  const paths = Object.freeze({
    worker: "/sw.js",
    runtime: "/scram/scramjet.js",
    controller: "/controller/controller.api.js",
    utils: "/scram/scramjet-utils.js",
    transport: "/clients/libcurl-client.js",
    injection: "/controller/controller.inject.js",
    wasm: "/scram/scramjet.wasm",
    wisp: "/wisp/"
  });
  const loadedScripts = new Map();
  let controllerPromise = null;

  function withTimeout(task, name, milliseconds = 15000) {
    let handle;
    return Promise.race([
      task,
      new Promise((_, reject) => {
        handle = setTimeout(() => reject(new Error(name + " timed out")), milliseconds);
      })
    ]).finally(() => clearTimeout(handle));
  }

  function loadScript(url) {
    if (loadedScripts.has(url)) return loadedScripts.get(url);
    const promise = withTimeout(new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.async = false;
      script.onload = () => resolve();
      script.onerror = () => {
        script.remove();
        reject(new Error("Browser engine file could not load: " + url));
      };
      document.head.append(script);
    }), "Loading " + url).catch(error => {
      loadedScripts.delete(url);
      throw error;
    });
    loadedScripts.set(url, promise);
    return promise;
  }

  async function waitForServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      throw new Error("This browser does not support service workers.");
    }
    if (!window.isSecureContext) {
      throw new Error("Open Celestial over HTTPS to use the browser.");
    }
    const registration = await withTimeout(
      navigator.serviceWorker.register(paths.worker, {
        type: "classic",
        updateViaCache: "none"
      }),
      "Registering the browser worker"
    );
    await withTimeout(navigator.serviceWorker.ready, "Activating the browser worker");
    // A newly installed worker may be active without controlling this tab.
    // Scramjet navigations require a controlling worker, not merely an active one.
    if (!navigator.serviceWorker.controller) {
      const reloadKey = "celestial:proxy-worker-reload";
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, "1");
        location.reload();
        throw new Error("Activating the browser worker. The page will reload once.");
      }
      await withTimeout(new Promise((resolve, reject) => {
        const onChange = () => {
          if (!navigator.serviceWorker.controller) return;
          navigator.serviceWorker.removeEventListener("controllerchange", onChange);
          resolve();
        };
        navigator.serviceWorker.addEventListener("controllerchange", onChange);
        registration.active?.postMessage({type:"SKIP_WAITING"});
        if (navigator.serviceWorker.controller) onChange();
      }), "Waiting for the Scramjet worker to control this page", 12000);
    }
    sessionStorage.removeItem("celestial:proxy-worker-reload");
    return navigator.serviceWorker.controller;
  }

  window.initBootstrap = function initBootstrap() {
    if (!controllerPromise) {
      controllerPromise = (async () => {
        const worker = await waitForServiceWorker();
        // Controller expects the runtime first; utility plugins are last.
        await loadScript(paths.runtime);
        await loadScript(paths.controller);
        await loadScript(paths.utils);
        await loadScript(paths.transport);

        const controllerApi = window.$scramjetController;
        const Transport = window.LibcurlTransport?.LibcurlClient;
        if (!controllerApi?.Controller || !controllerApi.config) {
          throw new Error("The Scramjet controller is unavailable or outdated.");
        }
        if (!Transport) throw new Error("The browser transport did not load.");

        controllerApi.config.injectPath = paths.injection;
        controllerApi.config.wasmPath = paths.wasm;
        controllerApi.config.scramjetPath = paths.runtime;

        const transport = new Transport({
          wisp: (location.protocol === "https:" ? "wss:" : "ws:") +
            "//" + location.host + paths.wisp
        });
        const controller = new controllerApi.Controller({
          serviceworker: worker,
          transport
        });
        await withTimeout(controller.wait(), "Starting the browser engine", 25000);
        return controller;
      })().catch(error => {
        controllerPromise = null;
        throw error;
      });
    }
    return controllerPromise;
  };
})();
