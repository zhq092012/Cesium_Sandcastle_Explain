import React, { Suspense, useEffect, useState } from 'react';
import * as Cesium from 'cesium';

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

  useEffect(() => {
    // Inject custom cesium token from parent window if available
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SET_CESIUM_TOKEN') {
        Cesium.Ion.defaultAccessToken = event.data.token;
      }
    };
    window.addEventListener('message', handleMessage);
    
    // Ask parent window for token
    if (window.parent) {
      window.parent.postMessage({ type: 'GET_CESIUM_TOKEN' }, '*');
    }

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

  if (!Comp) {
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
