import './boba-launch.css';

// The full workspace is not imported until the campus introduction has played.
const INTRO_MS = 3000;
const FADE_MS = 720;
const startedAt = performance.now();
const campus = document.getElementById('academyLanding');
const app = document.getElementById('root');

async function waitForWorkspace() {
  const ready = () => {
    const views = document.getElementById('views');
    return views && !views.hidden;
  };
  if (ready()) return;
  await new Promise(resolve => {
    const watcher = new MutationObserver(() => {
      if (!ready()) return;
      watcher.disconnect();
      clearTimeout(timeout);
      resolve();
    });
    watcher.observe(app, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden'] });
    const timeout = setTimeout(() => {
      watcher.disconnect();
      resolve();
    }, 10000);
  });
}

async function begin() {
  if (!campus || !app) return;
  try {
    // Vite loads the workspace and its styles on demand, after the introduction.
    await import('./boba-client.js');
    await waitForWorkspace();
    app.removeAttribute('aria-busy');
    document.title = 'Celestial';
    document.documentElement.classList.add('academy-finished');
    campus.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
      campus.remove();
      document.documentElement.classList.remove('academy-loading');
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : FADE_MS);
  } catch (error) {
    console.error('Workspace launch failed:', error);
    campus.classList.add('ac-failed');
    const message = campus.querySelector('.ac-error');
    if (message) message.textContent = 'The workspace could not open. Refresh the page to try again.';
  }
}

setTimeout(begin, Math.max(0, INTRO_MS - (performance.now() - startedAt)));
