import React, { useState, useRef, useEffect } from 'react';
import { useCadStore } from './code/cadStore';
import Editor from '@monaco-editor/react';
import { X, FileCode, Play, Save, FolderPlus, FilePlus, Settings, Search } from 'lucide-react';
import { WorkspaceTabs } from './code/WorkspaceTabs';
import { EditorSettingsDrawer, EditorSettings, DEFAULT_EDITOR_SETTINGS } from './EditorSettingsDrawer';

export const CodeWorkspace: React.FC = () => {
  const {
    openCodeFiles,
    activeCodeFilePath,
    openCodeFile,
    closeCodeFile,
    updateCodeFileContent,
    addProjectCodeFile,
    theme,
  } = useCadStore();

  const isDark = theme === 'dark';
  const editorRef = useRef<any>(null);
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileFolder, setNewFileFolder] = useState('src');
  const [newFileType, setNewFileType] = useState('tsx');

  const [editorSettings, setEditorSettings] = useState<EditorSettings>(() => {
    try {
      const saved = localStorage.getItem('eya_editor_settings');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_EDITOR_SETTINGS;
  });

  const handleSettingsChange = (newSettings: EditorSettings) => {
    setEditorSettings(newSettings);
    try {
      localStorage.setItem('eya_editor_settings', JSON.stringify(newSettings));
    } catch {
      // ignore
    }
  };

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  useEffect(() => {
    return () => {
      if (editorRef.current) {
        try {
          editorRef.current.getModel()?.dispose();
        } catch {
          // ignore
        }
        editorRef.current = null;
      }
    };
  }, []);


  const handleFindReplace = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const findReplaceAction = editorRef.current.getAction('editor.action.startFindReplaceAction');
    if (findReplaceAction) {
      findReplaceAction.run();
    } else {
      editorRef.current.getAction('actions.find')?.run();
    }
  };

  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    let name = newFileName.trim();
    if (!name) return;

    // Check extension
    if (!name.includes('.')) {
      name = `${name}.${newFileType}`;
    }

    const folder = newFileFolder.trim();
    const fullPath = folder ? `${folder}/${name}` : name;

    let defaultContent = '// Nouveau fichier\n';
    if (newFileType === 'tsx' || newFileType === 'ts' || name.endsWith('.tsx') || name.endsWith('.ts')) {
      defaultContent = '// App event logic — run it in Preview\nimport { useState } from "react";\n\nexport function useAppLogic() {\n  const [count, setCount] = useState(0);\n  return { count, setCount };\n}\n';
    } else if (newFileType === 'kt' || name.endsWith('.kt')) {
      defaultContent = '// App event logic — Jetpack Compose\nvar count by remember { mutableStateOf(0) }\n';
    } else if (newFileType === 'dart' || name.endsWith('.dart')) {
      defaultContent = '// App event logic — Flutter\nint count = 0;\n';
    } else if (newFileType === 'json' || name.endsWith('.json')) {
      defaultContent = '{\n  "version": "1.0",\n  "enabled": true\n}\n';
    }

    addProjectCodeFile({
      path: fullPath,
      name,
      content: defaultContent,
      language: newFileType === 'tsx' || newFileType === 'ts' ? 'typescript' : newFileType === 'kt' ? 'kotlin' : newFileType === 'dart' ? 'dart' : newFileType === 'json' ? 'json' : 'plaintext',
    });

    setNewFileName('');
    setIsNewFileModalOpen(false);
  };

  const activeFile = openCodeFiles.find((f: any) => f.path === activeCodeFilePath) || openCodeFiles[0];

  if (!activeFile) {
    return (
      <div className={`flex-1 h-full flex flex-col items-center justify-center ${isDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-50 text-slate-600'}`}>
        <FileCode className="w-12 h-12 mb-3 stroke-1 text-slate-500 animate-pulse" />
        <p className="text-sm font-medium">Aucun fichier source ouvert</p>
        <p className="text-xs text-slate-500 mt-1">Sélectionnez un fichier dans l'explorateur à gauche pour commencer l'édition.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full min-w-0 w-full flex flex-col overflow-hidden relative">
      {/* File Tabs Bar */}
      <WorkspaceTabs
        tabs={openCodeFiles.map((file: any) => ({ id: file.path, title: file.name, icon: FileCode }))}
        activeTabId={activeFile.path}
        onTabClick={(id) => {
          const file = openCodeFiles.find((f: any) => f.path === id);
          if (file) openCodeFile(file);
        }}
        onTabClose={closeCodeFile}
        onAddClick={() => setIsNewFileModalOpen(true)}
        addTitle="Nouveau fichier source (+)"
        isDark={isDark}
      />

      {/* Editor Toolbar */}
      <div className={`h-9 px-4 flex items-center justify-between border-b shrink-0 text-xs font-mono ${
        isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
      }`}>
       {/* j‘ai caché la badge poue certaine raison*/}
        <div className="flex items-center space-x-2">
        <div className="hidden">
          <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{activeFile.path}</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 uppercase tracking-wider font-semibold">{activeFile.language}</span>
        </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              alert(`Launch Preview to run the app event logic in ${activeFile.name}.`);
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition shadow-xs cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Run in Preview</span>
          </button>

          {/* Find & Replace button */}
          <button
            type="button"
            onClick={handleFindReplace}
            className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center justify-center ${
              isDark
                ? 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800'
                : 'border-slate-200 bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-100'
            }`}
            title="Rechercher et remplacer (Ctrl+F)"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Black minimalist rounded settings icon */}
          <button
            type="button"
            onClick={() => setIsSettingsDrawerOpen(true)}
            className="p-1.5 rounded-lg bg-black text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-200 transition shadow-xs cursor-pointer flex items-center justify-center"
            title="Paramètres de l'éditeur (Editor settings)"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 w-full h-full relative overflow-hidden">
        <Editor
          height="100%"
          language={activeFile.language}
          theme={isDark ? 'vs-dark' : 'light'}
          value={activeFile.content}
          onMount={handleEditorDidMount}
          onChange={(value) => updateCodeFileContent(activeFile.path, value || '')}
          options={{
            fontSize: 13,
            wordWrap: editorSettings.textWrapping ? 'on' : 'off',
            fontLigatures: editorSettings.fontLigatures,
            minimap: { enabled: editorSettings.minimap },
            folding: editorSettings.folding,
            lineNumbers: editorSettings.lineNumbers ? 'on' : 'off',
            stickyScroll: { enabled: editorSettings.stickyScroll },
            guides: {
              indentation: editorSettings.renderIndentationGuides,
              highlightActiveIndentation: editorSettings.renderIndentationGuides,
            },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
          }}
        />
      </div>

      {/* New File Modal */}
      {isNewFileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 ${
              isDark ? 'bg-[#0f1319] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <FilePlus className="w-4 h-4 text-blue-500" />
                <span>Nouveau fichier source</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsNewFileModalOpen(false)}
                className={`p-1 rounded-lg cursor-pointer ${
                  isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFile} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5">Nom du fichier</label>
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="ex: relay_logic.cpp"
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5">Dossier cible</label>
                  <select
                    value={newFileFolder}
                    onChange={(e) => setNewFileFolder(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="src">src/</option>
                    <option value="include">include/</option>
                    <option value="config">config/</option>
                    <option value="docs">docs/</option>
                    <option value="">Racine du projet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">Type de syntaxe</label>
                  <select
                    value={newFileType}
                    onChange={(e) => setNewFileType(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="tsx">React / TypeScript (.tsx)</option>
                    <option value="ts">TypeScript (.ts)</option>
                    <option value="kt">Jetpack Compose (.kt)</option>
                    <option value="dart">Flutter (.dart)</option>
                    <option value="json">JSON (.json)</option>
                    <option value="md">Markdown (.md)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewFileModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                    isDark
                      ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!newFileName.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-md transition cursor-pointer"
                >
                  Créer et Ouvrir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Editor Settings Drawer */}
      <EditorSettingsDrawer
        isOpen={isSettingsDrawerOpen}
        onClose={() => setIsSettingsDrawerOpen(false)}
        settings={editorSettings}
        onChange={handleSettingsChange}
        isDark={isDark}
      />
    </div>
  );
};
