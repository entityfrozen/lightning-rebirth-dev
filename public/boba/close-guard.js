// A native close confirmation. Browsers control its wording and can choose not
// to display it, especially before the user has interacted with the page.
export const CLOSE_GUARD_KEY='boba.preventClose';
export const closeGuardEnabled=()=>localStorage.getItem(CLOSE_GUARD_KEY)!=='false';

export function installCloseGuard(target=window){
  const onLeave=event=>{
    if(!closeGuardEnabled())return;
    event.preventDefault();
    event.returnValue='';
  };
  target.addEventListener('beforeunload',onLeave);
  return ()=>target.removeEventListener('beforeunload',onLeave);
}
