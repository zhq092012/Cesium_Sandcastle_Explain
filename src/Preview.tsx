import React, { Suspense, useEffect, useState } from 'react';
import { applyCesiumIonToken } from './cesiumIon';

// Error Boundary for trapping runtime errors in the cesium examples
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Preview runtime error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          color: '#ff6b6b',
          fontFamily: 'monospace',
          backgroundColor: '#1a1111',
          height: '100vh',
          overflow: 'auto',
          border: '1px solid #ff4444',
          boxSizing: 'border-box'
        }}>
          <h3>⚠️ Runtime Error in Example</h3>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
            {this.state.error?.stack || this.state.error?.message}
          </pre>
          <p style={{ marginTop: '15px', color: '#888' }}>
            Fix the error in the editor and the preview will reload automatically.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function Preview() {
  const [exampleName, setExampleName] = useState<string>('');
  const [Comp, setComp] = useState<React.ComponentType | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** True after the ion token handshake (or timeout) so Ion requests do not race the parent message. */
  const [ionReady, setIonReady] = useState(false);

  useEffect(() => {
    // 在创建 Viewer 之前应用 token（localStorage > .env）
    applyCesiumIonToken();

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SET_CESIUM_TOKEN') {
        applyCesiumIonToken(
          typeof event.data.token === 'string' ? event.data.token : undefined,
        );
        setIonReady(true);
      }
    };
    window.addEventListener('message', handleMessage);

    const runningInIframe = window.parent != null && window.parent !== window;
    if (runningInIframe) {
      window.parent.postMessage({ type: 'GET_CESIUM_TOKEN' }, '*');
    } else {
      setIonReady(true);
    }

    // Iframe waits for the parent SET_CESIUM_TOKEN handshake. A short timeout
    // used to mark ready first and start fromIonAssetId with Cesium's default
    // token, which cannot read account assets such as Melbourne 69380.
    const readyTimeout = window.setTimeout(() => {
      setIonReady(true);
    }, runningInIframe ? 2500 : 0);

    const path = window.location.pathname;
    const name = path.replace('/preview/', '');
    setExampleName(name);

    if (name) {
      // Dynamic import in Vite relative to current file
      const importPromise = import(`./examples/${name}/index.tsx`);
      importPromise
        .then((module) => {
          setComp(() => module.default);
          setLoadError(null);
        })
        .catch((err) => {
          console.error("Failed to load component", err);
          setLoadError(`Failed to load example "${name}". It might not exist or has compilation errors.`);
        });
    }

    return () => {
      window.removeEventListener('message', handleMessage);
      window.clearTimeout(readyTimeout);
    };
  }, []);

  if (loadError) {
    return (
      <div style={{ padding: '20px', color: '#ff8888', fontFamily: 'monospace', backgroundColor: '#0a0e17', height: '100vh' }}>
        <h3>Error Loading Example</h3>
        <p>{loadError}</p>
      </div>
    );
  }

  if (!exampleName) {
    return (
      <div style={{ padding: '20px', color: '#888', backgroundColor: '#0a0e17', height: '100vh' }}>
        No example specified in preview URL.
      </div>
    );
  }

  if (!Comp || !ionReady) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: '#8b949e',
        fontSize: '14px',
        fontFamily: 'sans-serif',
        backgroundColor: '#0a0e17'
      }}>
        Loading preview...
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#8b949e', backgroundColor: '#0a0e17' }}>
          Loading module...
        </div>
      }>
        <Comp />
      </Suspense>
    </ErrorBoundary>
  );
}
