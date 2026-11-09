import React from 'react';

// A failed GPU context should never take Chat, Browser or AI down with it.
export class SceneBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.warn('Celestial 3D scene unavailable:', error?.message || error); }
  render() { return this.state.failed ? (this.props.fallback || null) : this.props.children; }
}
