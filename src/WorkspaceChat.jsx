import React from 'react';
import {Messenger} from './Messenger.jsx';

export function WorkspaceChat({user,live,onClose,onOpenChat}) {
  return <Messenger compact user={user} live={live} onClose={onClose} onOpenChat={onOpenChat}/>;
}
