/* Boba account presentation, backed exclusively by existing Bolt v5 session APIs. */
(() => {
  const $ = s => document.querySelector(s);
  const form = $('[data-aform]'), seg = $('[data-amode]'), sub = $('[data-asub]');
  const msg = $('[data-amsg]'), note = $('[data-anote]'), alt = $('[data-alt]');
  let mode = 'in', busy = false;
  const field = name => form.elements.namedItem(name);
  function say(message, good = false) {
    msg.textContent = message || '';
    msg.hidden = !message;
    msg.classList.toggle('ok', good);
  }
  function thumb() {
    const button = seg.querySelector('button.on');
    const indicator = seg.querySelector('.th');
    indicator.style.width = button.offsetWidth + 'px';
    indicator.style.transform = 'translateX(' + (button.offsetLeft - 3) + 'px)';
  }
  function show(next) {
    if (busy) return;
    mode = next;
    const register = mode === 'up';
    const confirm = field('confirmPassword');
    confirm.disabled = !register;
    confirm.required = register;
    confirm.value = '';
    $('[data-f="confirm"]').hidden = !register;
    field('username').maxLength = register ? 20 : 32;
    field('username').pattern = register ? '[A-Za-z0-9_]{3,20}' : '.*';
    field('password').autocomplete = register ? 'new-password' : 'current-password';
    field('password').type = confirm.type = 'password';
    document.querySelectorAll('[data-reveal]').forEach(b => { b.textContent = 'Show'; });
    seg.querySelectorAll('button').forEach(button => {
      const active = button.dataset.v === mode;
      button.classList.toggle('on', active);
      button.setAttribute('aria-pressed', String(active));
    });
    sub.textContent = register ? 'Request account' : 'Sign in';
    alt.textContent = register ? 'Already have an account?' : 'Create an account';
    note.hidden = !register;
    say('');
    thumb();
  }
  seg.addEventListener('click', e => {
    const button = e.target.closest('[data-v]');
    if (button) show(button.dataset.v);
  });
  alt.addEventListener('click', () => show(mode === 'in' ? 'up' : 'in'));
  document.querySelectorAll('[data-reveal]').forEach(button => button.addEventListener('click', () => {
    const input = field(button.dataset.reveal);
    input.type = input.type === 'password' ? 'text' : 'password';
    button.textContent = input.type === 'password' ? 'Show' : 'Hide';
    button.setAttribute('aria-label', button.textContent + (button.dataset.reveal === 'password' ? ' password' : ' confirmation password'));
  }));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    const registering = mode === 'up';
    const username = field('username').value.trim(), password = field('password').value;
    if (registering && password !== field('confirmPassword').value) return say('Those passwords don’t match.');
    busy = sub.disabled = true;
    say('');
    try {
      const response = await fetch(registering ? '/api/register' : '/api/login', {
        method: 'POST', credentials: 'same-origin',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({username, password})
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Unable to sign in.');
      if (registering && data.status === 'pending') {
        busy = false;
        show('in');
        field('password').value = '';
        say('Account requested. An admin must approve it before you can sign in.', true);
        return;
      }
      if (!data.user) throw Error('Could not sign in. Please try again.');
      field('password').value = '';
      if (window.parent !== window) window.parent.postMessage({type:'celestial:auth-success'}, location.origin);
      else location.replace('/');
    } catch (error) { say(error.message || 'Something went wrong.'); }
    finally { busy = sub.disabled = false; }
  });
  try {
    const palette = localStorage.getItem('celestial.boba.theme') || 'boba';
    if (['boba','light','dark','strawberry','matcha','mango','sky','taro','midnight','brown','black'].includes(palette)) {
      document.documentElement.dataset.palette = palette;
      document.documentElement.dataset.theme = ['dark','taro','midnight','brown','black'].includes(palette) ? 'dark' : 'light';
    }
  } catch {}
  show('in');
  window.addEventListener('resize', thumb);
  document.fonts?.ready.then(thumb);
})();