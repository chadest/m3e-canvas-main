import React from 'react';

// Solid Black Folder Icon matching the reference screenshot
export const SolidFolderIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={`${className} shrink-0 fill-current`} fill="none">
    <path d="M2.5 5.5A2.5 2.5 0 0 1 5 3h4.6a2 2 0 0 1 1.4.6l1.4 1.4h6.6A2.5 2.5 0 0 1 21.5 7.5v11a2.5 2.5 0 0 1-2.5 2.5H5A2.5 2.5 0 0 1 2.5 18.5v-13z" />
  </svg>
);

// Python Logo Silhouette (Solid Black)
export const PythonFileIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={`${className} shrink-0 fill-current`} fill="none">
    <path d="M11.91 2C6.44 2 6.78 4.38 6.78 4.38L6.8 6.84H12v.74H4.37S2 7.28 2 12.72c0 5.46 2.08 5.23 2.08 5.23H5.8v-2.47s-.11-2.95 2.89-2.95h5.17s2.78.04 2.78-2.73V4.73S17.06 2 11.91 2zm-2.2 1.54a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6zm2.38 18.46c5.47 0 5.13-2.38 5.13-2.38l-.02-2.46H12v-.74h7.63s2.37.3 2.37-5.14c0-5.46-2.08-5.23-2.08-5.23H18.2v2.47s.11 2.95-2.89 2.95h-5.17s-2.78-.04-2.78 2.73v5.07s-.42 2.73 4.73 2.73zm2.2-1.54a.8.8 0 1 1 0-1.6.8.8 0 0 1 0 1.6z" />
  </svg>
);

// C++ Logo Icon matching the bold C++ in screenshot
export const CppFileIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={`${className} shrink-0 fill-current`} fill="none">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M7.6 7.2C5.4 7.2 3.8 8.9 3.8 11.9c0 3.1 1.6 4.9 3.8 4.9 1.6 0 2.8-.8 3.5-2l-1.9-1.1c-.4.7-1 1-1.6 1-1.1 0-1.8-.9-1.8-2.8 0-1.8.7-2.8 1.8-2.8.6 0 1.2.4 1.6 1l1.9-1.1c-.7-1.2-1.9-2-3.5-2zm6.2 3.4h-1.5v2.2h1.5V15h1.6v-2.2h2.2v-1.6h-2.2V9h-1.6v1.6zm5.8 0h-1.5v2.2h1.5V15h1.6v-2.2h2.2v-1.6h-2.2V9h-1.6v1.6z"
    />
  </svg>
);

// C Logo Icon
export const CFileIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={`${className} shrink-0 fill-current`} fill="none">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 5.5c-4.2 0-7.2 3-7.2 7.2 0 4.2 3 7.2 7.2 7.2 3.1 0 5.4-1.6 6.6-4l-3.3-1.8c-.7 1.4-1.8 2.1-3.3 2.1-2.2 0-3.6-1.6-3.6-3.5 0-2 1.4-3.5 3.6-3.5 1.5 0 2.6.7 3.3 2.1l3.3-1.8c-1.2-2.4-3.5-4-6.6-4z"
    />
  </svg>
);

// Text Document Icon (.txt) matching the screenshot notes.txt
export const TxtFileIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={`${className} shrink-0 fill-current`} fill="none">
    <path d="M5.5 3A2.5 2.5 0 0 0 3 5.5v13A2.5 2.5 0 0 0 5.5 21h13a2.5 2.5 0 0 0 2.5-2.5V9.5l-6.5-6.5h-9zm8 1.8 4.7 4.7H13.5V4.8zM7 11.5h10V13H7v-1.5zm0 3h10V16H7v-1.5zm0 3h6V19H7v-1.5z" />
  </svg>
);

// JavaScript Icon (.js) matching the solid JS square in screenshot
export const JsFileIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none">
    <rect width="19" height="19" x="2.5" y="2.5" rx="3.5" className="fill-current" />
    <path
      d="M7.8 14.8c.4.6.9 1 1.5 1 .8 0 1.3-.4 1.3-1.1V9h1.8v5.8c0 1.8-1.2 2.8-3 2.8-1.4 0-2.4-.7-2.9-1.8l1.3-.8zm6.5 1.9c.7.5 1.5.8 2.4.8 1.1 0 1.7-.5 1.7-1.1 0-.6-.5-.9-1.5-1.3l-.6-.2c-1.5-.6-2.4-1.3-2.4-2.7 0-1.6 1.3-2.8 3.2-2.8 1.1 0 1.9.3 2.6.8l-.8 1.4c-.6-.4-1.2-.6-1.8-.6-.9 0-1.3.4-1.3.9 0 .5.4.8 1.4 1.1l.6.2c1.7.6 2.6 1.4 2.6 2.8 0 1.7-1.4 2.9-3.4 2.9-1.2 0-2.3-.4-3.1-1l.7-1.5z"
      fill="white"
    />
  </svg>
);

// JSON Icon (.json)
export const JsonFileIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none">
    <rect width="19" height="19" x="2.5" y="2.5" rx="3.5" className="fill-current" />
    <text
      x="12"
      y="15.5"
      textAnchor="middle"
      fill="white"
      fontSize="10"
      fontWeight="900"
      fontFamily="monospace"
    >
      {'{ }'}
    </text>
  </svg>
);

// HTML Icon (.html)
export const HtmlFileIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none">
    <rect width="19" height="19" x="2.5" y="2.5" rx="3.5" className="fill-current" />
    <text
      x="12"
      y="15"
      textAnchor="middle"
      fill="white"
      fontSize="8.5"
      fontWeight="900"
      fontFamily="monospace"
    >
      {'</>'}
    </text>
  </svg>
);

// Fritzing File Icon (.fzz) matching screenshot
export const FzzFileIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none">
    <path
      d="M5.5 3A2.5 2.5 0 0 0 3 5.5v13A2.5 2.5 0 0 0 5.5 21h13a2.5 2.5 0 0 0 2.5-2.5V9.5l-6.5-6.5h-9z"
      className="fill-current"
    />
    <path d="M14.5 3v6.5H21" fill="none" stroke="white" strokeWidth="1.6" />
    <text
      x="10.5"
      y="16.5"
      textAnchor="middle"
      fill="white"
      fontSize="5.5"
      fontWeight="900"
      fontFamily="sans-serif"
    >
      .fzz
    </text>
  </svg>
);

// Generic Document Icon for other files
export const GenericFileIcon: React.FC<{ ext?: string; className?: string }> = ({
  ext = '',
  className = 'w-5 h-5',
}) => (
  <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none">
    <path
      d="M5.5 3A2.5 2.5 0 0 0 3 5.5v13A2.5 2.5 0 0 0 5.5 21h13a2.5 2.5 0 0 0 2.5-2.5V9.5l-6.5-6.5h-9z"
      className="fill-current"
    />
    <path d="M14.5 3v6.5H21" fill="none" stroke="white" strokeWidth="1.6" />
    {ext ? (
      <text
        x="10.5"
        y="16.5"
        textAnchor="middle"
        fill="white"
        fontSize="5.2"
        fontWeight="800"
        fontFamily="sans-serif"
      >
        {ext.slice(0, 4)}
      </text>
    ) : null}
  </svg>
);

// Function returning the exact icon for any file
export const getFileIcon = (filename: string, className = 'w-5 h-5') => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (ext === 'py') {
    return <PythonFileIcon className={className} />;
  }
  if (ext === 'cpp' || ext === 'cxx' || ext === 'cc' || ext === 'hpp') {
    return <CppFileIcon className={className} />;
  }
  if (ext === 'c' || ext === 'h' || ext === 'ino') {
    return <CFileIcon className={className} />;
  }
  if (ext === 'txt' || ext === 'md') {
    return <TxtFileIcon className={className} />;
  }
  if (ext === 'json') {
    return <JsonFileIcon className={className} />;
  }
  if (ext === 'html' || ext === 'htm') {
    return <HtmlFileIcon className={className} />;
  }
  if (ext === 'js' || ext === 'jsx' || ext === 'ts' || ext === 'tsx' || ext === 'mjs') {
    return <JsFileIcon className={className} />;
  }
  if (ext === 'fzz') {
    return <FzzFileIcon className={className} />;
  }

  return <GenericFileIcon ext={ext ? `.${ext}` : ''} className={className} />;
};
