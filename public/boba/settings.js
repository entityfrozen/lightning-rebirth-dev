import {$,$$,ico,lic,THEMES,ACCENTS,applyPrefs,segThumb,api} from './common.js';
export const settings = {
  html: () => {
    return '<div class="set"><h1 class="r">Settings</h1>' +
      '<div class="gt r" style="--d:.04s">Look</div><section class="grp gl g2 r" style="--d:.04s">' +
      '<div class="lr">' + lic("tv", "#7d8ba0", "#4a5566") + "<h3>Theme</h3></div>" +
      '<div class="thms" data-themes>' + THEMES.map(([v, n, m]) => '<button class="thm" type="button" data-v="' + v + '" data-pal="' + v + '" data-mode="' + m + '" aria-label="' + n + '"><span class="pv"></span><span>' + n + "</span></button>").join("") + "</div>" +
      '<div class="lr">' + lic("star", "#ffb547", "#ff7a1a") + '<h3>Accent</h3><div class="sws" data-acc>' +
      ACCENTS.map((c, i) => '<button class="sw" data-i="' + i + '" aria-label="Accent ' + (i + 1) + '" style="background:' + c[0] + '"></button>').join("") + "</div></div>" +
      '<div class="lr">' + lic("ask", "#c084fc", "#7c3aed") + '<h3>Effects</h3><div class="seg" data-fx><span class="th"></span><button data-v="full">Full</button><button data-v="lite">Lite</button></div></div></section>' +
      '<div class="gt r" style="--d:.08s">Browsing</div><section class="grp gl g2 r" style="--d:.08s">' +
      '<div class="lr">' + lic("link", "#2be0e6", "#0b8f86") + '<h3>Connection</h3><span class="netst"><i data-cn></i><span data-cnm>Checking</span></span></div></section>' +
      '<div class="gt r" style="--d:.12s">This tab</div><section class="grp gl g2 r" style="--d:.12s">' +
      '<div class="lr">' + lic("trash", "#ff6b6b", "#d62e4a") + '<h3>Reset local preferences</h3><button class="btn s" data-reset>Reset</button></div></section></div>';
  },

  mount(root){
    const paint=()=>{applyPrefs();const p=localStorage.getItem('celestial.boba.theme')||'boba';$$('.thm',root).forEach(b=>b.classList.toggle('on',b.dataset.v===p));$$('.sw',root).forEach(b=>b.classList.toggle('on',Number(b.dataset.i)===Number(localStorage.getItem('boba.accent')||0)));const seg=$('[data-fx]',root);$$('button',seg).forEach(b=>b.classList.toggle('on',b.dataset.v===document.documentElement.dataset.fx));segThumb(seg)};
    root.addEventListener('click',e=>{const t=e.target.closest('.thm'),a=e.target.closest('.sw'),f=e.target.closest('[data-fx] button');if(t)localStorage.setItem('celestial.boba.theme',t.dataset.v);if(a)localStorage.setItem('boba.accent',a.dataset.i);if(f)localStorage.setItem('boba.fx',f.dataset.v);if(e.target.closest('[data-reset]')){for(const k of ['celestial.boba.theme','boba.accent','boba.fx'])localStorage.removeItem(k)}paint()});
    api('/api/browser/status').then(d=>{$('[data-cnm]',root).textContent=d.proxy?'Available':'Unavailable'}).catch(()=>{$('[data-cnm]',root).textContent='Offline'});
    paint();return paint;
  }
};
