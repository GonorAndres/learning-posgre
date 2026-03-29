"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export default class MapErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidMount() {
    // Suppress the luma.gl maxTextureDimension2D error that fires
    // via ResizeObserver in environments with limited WebGL2 (e.g. WSL2).
    // This error is non-fatal -- deck.gl falls back to WebGL1 and renders fine.
    window.addEventListener("error", this.handleWindowError);
    window.addEventListener("unhandledrejection", this.handlePromiseRejection);
  }

  componentWillUnmount() {
    window.removeEventListener("error", this.handleWindowError);
    window.removeEventListener("unhandledrejection", this.handlePromiseRejection);
  }

  handleWindowError = (e: ErrorEvent) => {
    if (e.message?.includes("maxTextureDimension2D")) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  };

  handlePromiseRejection = (e: PromiseRejectionEvent) => {
    if (String(e.reason)?.includes("maxTextureDimension2D")) {
      e.preventDefault();
    }
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
