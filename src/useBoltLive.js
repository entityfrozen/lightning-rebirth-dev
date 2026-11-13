import {useCallback,useEffect,useRef,useState} from 'react';

function applyServerMessage(servers,event){
  if(event.type==='v2Server')return servers.some(s=>s.id===event.server.id)?servers.map(s=>s.id===event.server.id?event.server:s):[...servers,event.server];
  if(!event.serverId)return servers;
  return servers.map(server=>{
    if(server.id!==event.serverId)return server;
    const messages={...server.messages};
    const channel=event.channel||event.entry?.channel;
    if(!channel)return server;
    const rows=[...(messages[channel]||[])];
    if(event.type==='v2Message')rows.push(event.entry);
    if(event.type==='v2MessageUpdate'){
      const index=rows.findIndex(m=>m.id===event.entry?.id);
      if(index>=0)rows[index]=event.entry;
    }
    if(event.type==='v2MessageDeleted'){
      messages[channel]=rows.filter(m=>m.id!==event.id);
      return {...server,messages};
    }
    messages[channel]=rows.slice(-150);
    return {...server,messages};
  });
}

export function useBoltLive(user){
  const [connected,setConnected]=useState(false);
  const [online,setOnline]=useState([]);
  const [servers,setServers]=useState([]);
  const [directory,setDirectory]=useState([]);
  const [latest,setLatest]=useState(null);
  const [selfId,setSelfId]=useState('');
  const [error,setError]=useState('');
  const socket=useRef(null);
  const counter=useRef(0);
  const send=useCallback(value=>{
    if(socket.current?.readyState!==WebSocket.OPEN)return false;
    socket.current.send(JSON.stringify(value));return true;
  },[]);
  useEffect(()=>{
    if(!user){setConnected(false);setOnline([]);setServers([]);return;}
    let stop=false,timer=0;
    const connect=()=>{
      if(stop)return;
      const protocol=location.protocol==='https:'?'wss:':'ws:';
      const ws=new WebSocket(protocol+'//'+location.host+'/live');
      socket.current=ws;
      ws.onopen=()=>{if(!stop){setConnected(true);setError('');}};
      ws.onmessage=event=>{
        let msg;try{msg=JSON.parse(event.data);}catch{return;}
        if(msg.type==='presence'||msg.type==='hello')setOnline(msg.online||[]);
        if(msg.type==='hello')setSelfId(msg.id||'');
        if(msg.type==='v2State'){
          setServers(msg.servers||[]);setDirectory(msg.directory||[]);
        }
        if(msg.type==='v2Directory')setDirectory(msg.directory||[]);
        if(['v2Server','v2Message','v2MessageUpdate','v2MessageDeleted'].includes(msg.type)){
          setServers(prev=>applyServerMessage(prev,msg));
        }
        if(msg.type==='error')setError(msg.message||'A server error occurred.');
        setLatest({...msg,serial:++counter.current});
      };
      ws.onclose=()=>{if(stop)return;setConnected(false);timer=setTimeout(connect,2500);};
      ws.onerror=()=>{if(!stop)setError('Connection interrupted. Reconnecting…');};
    };
    connect();
    return()=>{stop=true;clearTimeout(timer);socket.current?.close();socket.current=null;};
  },[user?.id]);
  return {connected,online,servers,directory,latest,error,send,selfId};
}
