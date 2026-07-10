import { useState, useEffect, useRef } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import { 
  Globe, 
  Code, 
  Plus, 
  Search, 
  Settings, 
  Save, 
  RefreshCw, 
  ExternalLink, 
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import './App.css';

interface Example {
  name: string;
  code: string;
  notes: string;
}

export default function App() {
  const [examples, setExamples] = useState<Example[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExample, setSelectedExample] = useState<Example | null>(null);
  
  // Sidebar toggle state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Settings & Tokens
  const [cesiumToken, setCesiumToken] = useState<string>(() => {
    return localStorage.getItem('cesium_ion_token') || '';
  });
  const [showTokenPanel, setShowTokenPanel] = useState(false);

  // Toggle sidebar via keyboard shortcut (Ctrl+B / Cmd+B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search & Navigation
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'code' | 'notes'>('code');

  // Drafts
  const [draftCode, setDraftCode] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // New Sandbox Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newExampleName, setNewExampleName] = useState('');
  const [createError, setCreateError] = useState('');

  // Typings cache
  const [cesiumTypes, setCesiumTypes] = useState<string>('');

  // Iframe key to force reload
  const [iframeKey, setIframeKey] = useState(0);

  // Ref to hold the Monaco editor instance
  const editorRef = useRef<any>(null);

  // Hook to get the active monaco instance
  const monaco = useMonaco();

  // Inject Cesium typings and compiler options dynamically when monaco and typings are ready
  useEffect(() => {
    if (!monaco || !cesiumTypes) return;

    // Configure typescript compiler options
    const tsDefaults = (monaco as any).languages.typescript.typescriptDefaults;
    tsDefaults.setCompilerOptions({
      target: (monaco as any).languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: (monaco as any).languages.typescript.ModuleResolutionKind.NodeJs,
      module: (monaco as any).languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      typeRoots: ["node_modules/@types"],
      jsx: (monaco as any).languages.typescript.JsxEmit.React,
      jsxFactory: 'React.createElement',
      reactNamespace: 'React',
      allowJs: true,
    });

    // Add extra lib using file URI so Monaco resolves module 'cesium' imports correctly
    const disposable = tsDefaults.addExtraLib(
      cesiumTypes,
      'file:///node_modules/cesium/index.d.ts'
    );

    return () => {
      disposable.dispose();
    };
  }, [monaco, cesiumTypes]);

  // Fetch list of examples
  const fetchExamples = async (selectName?: string) => {
    try {
      const res = await fetch('/api/examples');
      const data = await res.json();
      setExamples(data);
      
      if (data.length > 0) {
        // Select either the specified one, the previously selected one, or the first one
        const target = selectName 
          ? data.find((e: Example) => e.name === selectName) 
          : (selectedExample ? data.find((e: Example) => e.name === selectedExample.name) : null);
        
        const active = target || data[0];
        setSelectedExample(active);
        setDraftCode(active.code);
        setDraftNotes(active.notes);
      } else {
        setSelectedExample(null);
        setDraftCode('');
        setDraftNotes('');
      }
    } catch (err) {
      console.error('Failed to fetch examples:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Cesium types for Monaco Editor autocomplete
  const fetchCesiumTypes = async () => {
    try {
      const res = await fetch('/api/cesium-types');
      if (res.ok) {
        const text = await res.text();
        setCesiumTypes(text);
      }
    } catch (err) {
      console.error('Failed to load Cesium types:', err);
    }
  };

  useEffect(() => {
    fetchExamples();
    fetchCesiumTypes();
  }, []);

  // Listen to messages from the preview iframe requesting the Cesium token
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'GET_CESIUM_TOKEN') {
        sendTokenToIframe();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [cesiumToken, selectedExample]);

  const sendTokenToIframe = () => {
    const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'SET_CESIUM_TOKEN',
        token: cesiumToken
      }, '*');
    }
  };

  // Keep localStorage and iframe updated when token changes
  const handleTokenChange = (val: string) => {
    setCesiumToken(val);
    localStorage.setItem('cesium_ion_token', val);
    setTimeout(() => {
      sendTokenToIframe();
      // Reload iframe to apply new token
      setIframeKey(k => k + 1);
    }, 100);
  };

  // Handle Save (Ctrl+S / Cmd+S / Save button)
  const handleSave = async () => {
    if (!selectedExample || isSaving) return;
    setIsSaving(true);

    let codeToSave = draftCode;

    // Auto format typescript code if in the code editor tab
    if (activeTab === 'code' && editorRef.current) {
      try {
        const action = editorRef.current.getAction('editor.action.formatDocument');
        if (action) {
          await action.run();
          // Read formatted value
          codeToSave = editorRef.current.getValue();
          setDraftCode(codeToSave);
        }
      } catch (err) {
        console.warn('Auto-formatting failed, saving original code:', err);
      }
    }

    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedExample.name,
          code: codeToSave,
          notes: draftNotes
        })
      });

      if (res.ok) {
        // Update local state without full reload
        setExamples(prev => prev.map(e => 
          e.name === selectedExample.name 
            ? { ...e, code: codeToSave, notes: draftNotes } 
            : e
        ));
        setSelectedExample(prev => prev ? { ...prev, code: codeToSave, notes: draftNotes } : null);
        
        // Force refresh the iframe preview
        setIframeKey(k => k + 1);
      } else {
        alert('Failed to save changes');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Watch key presses for save shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedExample, draftCode, draftNotes, isSaving]);

  // Create new example
  const handleCreateExample = async () => {
    if (!newExampleName.trim()) {
      setCreateError('Name is required');
      return;
    }
    const sanitizedName = newExampleName.trim().replace(/[^a-zA-Z0-9_]/g, '_');
    
    try {
      const res = await fetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: sanitizedName })
      });
      const data = await res.json();
      
      if (res.ok) {
        setShowNewModal(false);
        setNewExampleName('');
        setCreateError('');
        // Refresh examples list and auto-select the new one
        await fetchExamples(data.name);
        setIframeKey(k => k + 1);
      } else {
        setCreateError(data.error || 'Failed to create example');
      }
    } catch (err) {
      console.error(err);
      setCreateError('Error creating example');
    }
  };

  // Switch selection
  const selectExample = (ex: Example) => {
    setSelectedExample(ex);
    setDraftCode(ex.code);
    setDraftNotes(ex.notes);
    setIframeKey(k => k + 1);
  };

  // Autocomplete setup for Monaco Editor handled reactively via useMonaco hook

  const filteredExamples = examples.filter(ex => 
    ex.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasUnsavedChanges = selectedExample && (
    draftCode !== selectedExample.code || 
    draftNotes !== selectedExample.notes
  );

  return (
    <div className="app-container">
      {/* Sidebar Panel */}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="brand">
            <Globe size={24} className="brand-icon" />
            <h1>Cesium Explorer</h1>
          </div>
          
          <button 
            className="token-config-btn"
            onClick={() => setShowTokenPanel(!showTokenPanel)}
          >
            <Settings size={12} />
            Cesium Ion Token Config
          </button>

          {showTokenPanel && (
            <div className="token-panel">
              <label>Ion Access Token:</label>
              <input 
                type="text" 
                placeholder="Paste Cesium Ion Token..."
                value={cesiumToken}
                onChange={(e) => handleTokenChange(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="search-and-create">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search sandboxes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="new-btn" onClick={() => setShowNewModal(true)}>
            <Plus size={16} />
            Create Sandbox
          </button>
        </div>

        <div className="examples-list-container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
              Loading examples...
            </div>
          ) : (
            <ul className="examples-list">
              {filteredExamples.map((ex) => (
                <li 
                  key={ex.name}
                  className={`example-item ${selectedExample?.name === ex.name ? 'active' : ''}`}
                  onClick={() => selectExample(ex)}
                >
                  <div className="example-item-info">
                    <Globe size={16} className="example-item-icon" />
                    <span className="example-name">{ex.name}</span>
                  </div>
                </li>
              ))}
              {filteredExamples.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                  No sandboxes found
                </div>
              )}
            </ul>
          )}
        </div>
      </aside>

      <button 
        className={`sidebar-toggle-btn ${isSidebarCollapsed ? 'collapsed' : ''}`}
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        title={isSidebarCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
      >
        {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Main Workspace Panels */}
      {selectedExample ? (
        <main className="workspace">
          {/* Editor/Notes Panel */}
          <section className="editor-panel">
            <div className="editor-header">
              <div className="editor-title">
                <h2>{selectedExample.name}</h2>
                <span>{hasUnsavedChanges ? '● Unsaved changes' : 'Saved'}</span>
              </div>

              <div className="editor-actions">
                <div className="tabs">
                  <button 
                    className={`tab-btn ${activeTab === 'code' ? 'active' : ''}`}
                    onClick={() => setActiveTab('code')}
                  >
                    <Code size={14} />
                    Code (TSX)
                  </button>
                  <button 
                    className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('notes')}
                  >
                    <FileText size={14} />
                    Study Notes
                  </button>
                </div>

                <button 
                  className="save-btn"
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || isSaving}
                >
                  <Save size={14} />
                  {isSaving ? 'Saving...' : 'Save (Cmd+S)'}
                </button>
              </div>
            </div>

            <div className="editor-content">
              {activeTab === 'code' ? (
                <Editor
                  height="100%"
                  language="typescript"
                  theme="vs-dark"
                  value={draftCode}
                  onChange={(val) => setDraftCode(val || '')}
                  onMount={(editor) => { editorRef.current = editor; }}
                  options={{
                    fontSize: 13,
                    fontFamily: 'var(--font-mono)',
                    minimap: { enabled: false },
                    automaticLayout: true,
                    tabSize: 2,
                    scrollbar: {
                      vertical: 'visible',
                      horizontal: 'visible',
                      verticalScrollbarSize: 8,
                      horizontalScrollbarSize: 8,
                    }
                  }}
                />
              ) : (
                <div className="notes-container">
                  <div className="notes-editor-pane">
                    <textarea 
                      value={draftNotes}
                      onChange={(e) => setDraftNotes(e.target.value)}
                      placeholder="Write markdown learning notes here..."
                    />
                  </div>
                  <div className="notes-preview-pane markdown-body">
                    <ReactMarkdown>{draftNotes}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Map Preview Panel */}
          <section className="preview-panel">
            <div className="preview-header">
              <div className="preview-title">
                <div className="preview-title-dot" />
                Live Map Preview
              </div>
              <div className="preview-actions">
                <button 
                  className="preview-action-btn"
                  title="Reload Preview"
                  onClick={() => setIframeKey(k => k + 1)}
                >
                  <RefreshCw size={14} />
                </button>
                <a 
                  className="preview-action-btn"
                  title="Open Preview in New Tab"
                  href={`/preview/${selectedExample.name}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
            <div className="preview-content">
              <iframe 
                id="preview-iframe"
                key={`${selectedExample.name}-${iframeKey}`}
                src={`/preview/${selectedExample.name}`}
                className="preview-iframe"
                title="Cesium Live Preview"
              />
            </div>
          </section>
        </main>
      ) : (
        <main className="workspace">
          <div className="no-examples-placeholder">
            <Globe size={48} style={{ opacity: 0.3 }} />
            <p>Select or create a sandbox example to get started</p>
          </div>
        </main>
      )}

      {/* New Sandbox Modal */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Sandbox Component</h3>
            
            <div className="modal-input-group">
              <label>Component Name (use Alphanumeric and _):</label>
              <input 
                type="text" 
                placeholder="e.g. FlightTracker3D"
                value={newExampleName}
                onChange={(e) => {
                  setNewExampleName(e.target.value);
                  setCreateError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateExample();
                }}
                autoFocus
              />
              {createError && <span style={{ color: '#ff6b6b', fontSize: '11px' }}>{createError}</span>}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowNewModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleCreateExample}>
                Create Component
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
