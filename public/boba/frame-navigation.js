/**
 * Navigate a Scramjet frame without copying the encoded destination into the
 * parent iframe's src attribute. The actual frame URL remains observable in
 * DevTools Network, the frame document, and the browser's running code.
 *
 * Scramjet's Frame.go() writes to frame.element.src; temporarily redirect
 * that write to a detached iframe, then navigate the real browsing context.
 */
export function navigateWithNeutralFrameSrc(frame,url){
 const element=frame?.element;
 if(!element?.isConnected||!element.contentWindow)throw Error('Browser frame is not ready');
 const scratch=element.ownerDocument.createElement('iframe');
 const original=frame.element;
 try{
  frame.element=scratch;
  frame.go(url);
 }finally{
  frame.element=original;
 }
 const destination=scratch.src;
 if(!destination||destination==='about:blank')throw Error('Proxy did not generate a destination');
 // A window navigation does not update its parent iframe's src attribute.
 // Do not remove or overwrite src after load: that would reset the frame.
 element.contentWindow.location.replace(destination);
}
