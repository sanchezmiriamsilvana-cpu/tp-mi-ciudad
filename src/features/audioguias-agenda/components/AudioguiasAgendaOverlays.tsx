import React from 'react';

import MiniPlayer from './MiniPlayer';
import NotificationNavigationListener from './NotificationNavigationListener';

export default function AudioguiasAgendaOverlays() {
  return (
    <>
      <NotificationNavigationListener />
      <MiniPlayer />
    </>
  );
}