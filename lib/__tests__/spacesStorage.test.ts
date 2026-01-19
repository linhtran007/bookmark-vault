import { v4 as uuidv4 } from "uuid";

jest.mock("uuid", () => ({
  v4: jest.fn(),
}));

import {
  PERSONAL_SPACE_ID,
  addSpace,
  deleteSpace,
  ensureDefaultSpace,
  getSpaces,
  updateSpace,
} from "@voc/lib/spacesStorage";

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

const fixedDate = new Date("2026-01-19T00:00:00.000Z");

describe("spacesStorage", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createLocalStorageMock(),
      writable: true,
    });

    (uuidv4 as jest.Mock).mockReset().mockReturnValue("space-id");

    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("ensures Personal space exists", () => {
    const personal = ensureDefaultSpace();
    expect(personal.id).toBe(PERSONAL_SPACE_ID);

    const spaces = getSpaces();
    expect(spaces.some((s) => s.id === PERSONAL_SPACE_ID)).toBe(true);
  });

  it("adds a new space", () => {
    ensureDefaultSpace();
    const created = addSpace({ name: "Work" });
    expect(created.name).toBe("Work");

    const spaces = getSpaces();
    expect(spaces.find((s) => s.id === created.id)?.name).toBe("Work");
  });

  it("updates a space", () => {
    ensureDefaultSpace();
    const created = addSpace({ name: "Work" });

    const updated = updateSpace({ ...created, name: "Work 2" });
    expect(updated?.name).toBe("Work 2");
    expect(getSpaces().find((s) => s.id === created.id)?.name).toBe("Work 2");
  });

  it("does not delete Personal space", () => {
    ensureDefaultSpace();
    expect(deleteSpace(PERSONAL_SPACE_ID)).toBe(false);
    expect(getSpaces().some((s) => s.id === PERSONAL_SPACE_ID)).toBe(true);
  });

  it("deletes a non-personal space", () => {
    ensureDefaultSpace();
    const created = addSpace({ name: "Work" });

    expect(deleteSpace(created.id)).toBe(true);
    expect(getSpaces().some((s) => s.id === created.id)).toBe(false);
  });
});
