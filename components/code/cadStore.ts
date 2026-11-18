import { useMemo, useState } from "react";

export type CodeFile = { path: string; name: string; content: string; language: string };

const DEFAULT_FILES: CodeFile[] = [
  { path: "src/app.logic.tsx", name: "app.logic.tsx", language: "typescript", content: '// App & UI event logic — run it in Preview\nimport { useState } from "react";\n\nexport function useAppLogic() {\n  const [cartCount, setCartCount] = useState(0);\n  const onAddToCart = () => setCartCount((n) => n + 1);\n  return { cartCount, onAddToCart };\n}\n' },
];

let shared: { open: CodeFile[]; active: string } = { open: [...DEFAULT_FILES], active: DEFAULT_FILES[0].path };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function useCadStore() {
  const [, force] = useState(0);
  // subscribe once per hook instance in this simple stub
  useMemo(() => {
    const l = () => force((x) => x + 1);
    listeners.add(l);
    return () => listeners.delete(l);
  }, []);

  return {
    // Code workspace
    openCodeFiles: shared.open,
    activeCodeFilePath: shared.active,
    openCodeFile: (file: CodeFile) => {
      if (!shared.open.find((f) => f.path === file.path)) shared.open = [...shared.open, file];
      shared.active = file.path;
      emit();
    },
    closeCodeFile: (path: string) => {
      shared.open = shared.open.filter((f) => f.path !== path);
      if (shared.active === path) shared.active = shared.open[0]?.path ?? "";
      emit();
    },
    updateCodeFileContent: (path: string, content: string) => {
      shared.open = shared.open.map((f) => (f.path === path ? { ...f, content } : f));
      emit();
    },
    addProjectCodeFile: (file: CodeFile) => {
      shared.open = [...shared.open, file];
      shared.active = file.path;
      emit();
    },
    theme: "light" as "light" | "dark",

    // Node editor state used by reference component
    nodeUndoCount: 0,
    nodeRedoCount: 0,
    setNodeHistoryCounts: (_counts: any) => {},
    toolMode: "select" as string,
    setToolMode: (_mode: string) => {},
  } as any;
}
