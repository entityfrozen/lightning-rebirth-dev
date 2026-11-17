/**
 * Local-only Scramjet diagnostics. Deliberately record known stage names,
 * durations and safe error categories, never URLs, search queries, cookies,
 * credentials, request bodies or raw third-party exceptions.
 */
const MAX_ENTRIES=80;
const events=[];
const stages=new Set([
 'bootstrap','worker-register','worker-control','runtime','controller-script',
 'utils','libcurl','controller-init','controller-ready','frame-create',
 'navigate','navigation-ready','navigation-failed','worker-changed','health'
]);
const outcomes=new Set(['start','ok','error','timeout','info']);
const safeReason=error=>{
 const code=String(error?.name||'').toLowerCase();
 const message=String(error?.message||'').toLowerCase();
 if(code==='securityerror'||/secure context|https|permission|blocked/.test(message))return 'security';
 if(/service worker|worker|controller/.test(message))return 'worker';
 if(/wasm|transport|wisp|socket|connection/.test(message))return 'transport';
 if(/timeout|timed out/.test(message))return 'timeout';
 if(/script|bootstrap|asset|could not load/.test(message))return 'asset';
 if(/http [45]\d\d/.test(message))return 'http-error';
 return 'unknown';
};
export function recordScramjet(stage,outcome='info',detail={}){
 if(!stages.has(stage)||!outcomes.has(outcome))return;
 const item={at:new Date().toISOString(),stage,outcome};
 if(Number.isFinite(detail.durationMs))item.durationMs=Math.max(0,Math.min(60000,Math.round(detail.durationMs)));
 if(detail.error)item.reason=safeReason(detail.error);
 if(detail.reason&&['security','worker','transport','timeout','asset','http-error','unknown'].includes(detail.reason))item.reason=detail.reason;
 events.push(item);
 if(events.length>MAX_ENTRIES)events.splice(0,events.length-MAX_ENTRIES);
 if(outcome==='error'||outcome==='timeout')console.warn('[Celestial Scramjet]',stage,outcome,item.reason||'unknown');
 try{window.dispatchEvent(new Event('celestial:scramjet-log'))}catch{}
}
export function getScramjetDiagnostics(){
 return {
  version:1,
  runtime:'browser',
  secureContext:typeof window!=='undefined'&&Boolean(window.isSecureContext),
  framed:typeof window!=='undefined'&&window.self!==window.top,
  serviceWorkerSupported:typeof navigator!=='undefined'&&'serviceWorker' in navigator,
  serviceWorkerControlled:typeof navigator!=='undefined'&&!!navigator.serviceWorker?.controller,
  events:events.map(e=>({...e}))
 };
}
export function clearScramjetDiagnostics(){events.length=0}
export function exportScramjetDiagnostics(){return JSON.stringify(getScramjetDiagnostics(),null,2)}
