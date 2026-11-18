type Counts = { undo: number; redo: number };

export const historyIndexedDB = {
  async pushSnapshot(_scope: string, _data: any, _immediate = false, _debounceMs = 250) {
    // no-op stub
  },
  subscribeCounts(_scope: string, cb: (counts: Counts) => void) {
    cb({ undo: 0, redo: 0 });
    return () => {};
  },
  subscribeRestore(_scope: string, _cb: (data: any) => void) {
    return () => {};
  },
};
