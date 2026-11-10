import {useCallback,useEffect,useState} from 'react';

/**
 * A real browser fullscreen state, not a CSS-only maximized window.
 * Must be called by a click or key event due to browser user-activation rules.
 */
export function useElementFullscreen(elementRef){
  const [isFullscreen,setFullscreen]=useState(false);
  const [fullscreenError,setFullscreenError]=useState('');

  useEffect(()=>{
    const sync=()=>setFullscreen(document.fullscreenElement===elementRef.current);
    document.addEventListener('fullscreenchange',sync);
    sync();
    return()=>document.removeEventListener('fullscreenchange',sync);
  },[elementRef]);

  const toggleFullscreen=useCallback(()=>{
    setFullscreenError('');
    const element=elementRef.current;
    if(!element)return;
    try{
      const operation=document.fullscreenElement===element
        ?document.exitFullscreen()
        :element.requestFullscreen();
      Promise.resolve(operation).catch(error=>{
        setFullscreenError(error?.message||'Fullscreen is unavailable in this browser.');
      });
    }catch(error){
      setFullscreenError(error?.message||'Fullscreen is unavailable in this browser.');
    }
  },[elementRef]);

  return {isFullscreen,fullscreenError,toggleFullscreen};
}
