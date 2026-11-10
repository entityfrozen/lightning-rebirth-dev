import React from 'react';
import {Messenger} from './Messenger.jsx';

export function Chat({user,live}) {
  return <Messenger user={user} live={live}/>;
}
