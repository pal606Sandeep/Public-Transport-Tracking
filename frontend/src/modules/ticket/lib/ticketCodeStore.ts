/**
 * The full ticket code (QR payload) is returned only once, in the POST /tickets
 * response. We stash it in sessionStorage so the freshly-bought ticket can still
 * render its QR after a reload, but it is intentionally not persisted long-term.
 */
const KEY = "ptt.ticketCodes";

type Store = Record<string, string>;

const read = (): Store => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "{}") as Store;
  } catch {
    return {};
  }
};

const write = (s: Store): void => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode / quota — QR just won't survive a reload */
  }
};

export const rememberTicketCode = (id: string, code: string): void => {
  const s = read();
  s[id] = code;
  write(s);
};

export const recallTicketCode = (id: string): string | null => read()[id] ?? null;

export const forgetTicketCode = (id: string): void => {
  const s = read();
  if (s[id]) {
    delete s[id];
    write(s);
  }
};
