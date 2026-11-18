import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

export interface EditorSettings {
  textWrapping: boolean;
  fontLigatures: boolean;
  minimap: boolean;
  folding: boolean;
  lineNumbers: boolean;
  stickyScroll: boolean;
  renderIndentationGuides: boolean;
}

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  textWrapping: false,
  fontLigatures: true,
  minimap: false,
  folding: false,
  lineNumbers: true,
  stickyScroll: true,
  renderIndentationGuides: true,
};

interface EditorSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: EditorSettings;
  onChange: (settings: EditorSettings) => void;
  isDark?: boolean;
}

export const EditorSettingsDrawer: React.FC<EditorSettingsDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onChange,
  isDark = false,
}) => {
  const toggleSetting = (key: keyof EditorSettings) => {
    onChange({
      ...settings,
      [key]: !settings[key],
    });
  };

  const settingItems: Array<{
    key: keyof EditorSettings;
    label: string;
    description: string;
  }> = [
    {
      key: 'textWrapping',
      label: 'Text wrapping',
      description: 'The text wraps around the edges of the editor.',
    },
    {
      key: 'fontLigatures',
      label: 'Font ligatures',
      description: 'Render the text with font ligatures.',
    },
    {
      key: 'minimap',
      label: 'Minimap',
      description: 'Render the minimap with the file overview.',
    },
    {
      key: 'folding',
      label: 'Folding',
      description: 'Enable folding to collapse code blocks.',
    },
    {
      key: 'lineNumbers',
      label: 'Line numbers',
      description: 'Render the line numbers for each line of code.',
    },
    {
      key: 'stickyScroll',
      label: 'Sticky scroll',
      description: 'Enable sticky scroll to show the nested code blocks.',
    },
    {
      key: 'renderIndentationGuides',
      label: 'Render indentation guides',
      description: 'Render indentation guides for each line of code.',
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-2xs"
          />

          {/* Drawer container from Right */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className={`fixed top-0 right-0 bottom-0 w-full max-w-[380px] z-50 flex flex-col shadow-2xl border-l select-none ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-2">
              <h2 className="text-lg font-bold tracking-tight">Editor settings</h2>
              <button
                type="button"
                onClick={onClose}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                }`}
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Subtitle */}
            <div className="px-6 pb-5 pt-1">
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                The following settings are available for your code editor.
              </p>
            </div>

            {/* Settings List */}
            <div className="flex-1 overflow-y-auto px-6 space-y-5 pb-8">
              {settingItems.map((item) => {
                const isEnabled = settings[item.key];
                return (
                  <div
                    key={item.key}
                    onClick={() => toggleSetting(item.key)}
                    className="flex items-start space-x-3.5 cursor-pointer group py-0.5"
                  >
                    {/* Toggle Switch */}
                    <div className="pt-0.5 shrink-0">
                      <div
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out flex items-center ${
                          isEnabled
                            ? isDark
                              ? 'bg-black border border-slate-700 justify-end'
                              : 'bg-black justify-end'
                            : isDark
                            ? 'bg-slate-800 justify-start'
                            : 'bg-slate-200 justify-start'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full transition-transform duration-200 shadow-xs ${
                            isEnabled
                              ? 'bg-white'
                              : isDark
                              ? 'bg-slate-500'
                              : 'bg-slate-500'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Setting Info */}
                    <div className="flex flex-col">
                      <span className="text-[13px] font-medium leading-snug group-hover:text-blue-500 transition-colors">
                        {item.label}
                      </span>
                      <span className={`text-[11.5px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {item.description}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
