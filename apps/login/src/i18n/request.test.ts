import { getLoginLanguages, LANGS } from "@/lib/i18n";
import { beforeEach, describe, expect, it, vi } from "vitest";
import backend from "../../../../internal/query/v2-default.json";
import english from "../../locales/en.json";
import hebrew from "../../locales/he.json";
import requestConfig from "./request";

const mocks = vi.hoisted(() => ({
  settings: vi.fn(),
  translations: vi.fn(),
  cookies: vi.fn(),
  headers: vi.fn(),
}));
vi.mock("next-intl/server", () => ({ getRequestConfig: (callback: unknown) => callback }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies, headers: mocks.headers }));
vi.mock("@/lib/service-url", () => ({ getServiceConfig: () => ({ serviceConfig: {} }) }));
vi.mock("@/lib/zitadel", () => ({
  getAllowedLanguages: mocks.settings,
  getHostedLoginTranslation: mocks.translations,
}));

function flatten(value: Record<string, unknown>, prefix = ""): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, entry]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof entry === "string" ? [[path, entry]] : Object.entries(flatten(entry as Record<string, unknown>, path));
    }),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.settings.mockResolvedValue({ allowedLanguages: ["en", "de", "he", "ar"], defaultLanguage: "en" });
  mocks.translations.mockResolvedValue({});
  mocks.cookies.mockResolvedValue({ get: () => undefined });
  mocks.headers.mockResolvedValue(new Headers());
});

describe("Yeda login languages", () => {
  it("offers English and Hebrew with complete, matching server translations", () => {
    expect(LANGS.map((language) => language.code)).toEqual(["en", "he"]);
    const source = flatten(english);
    const translated = flatten(hebrew);
    expect(Object.keys(translated).sort()).toEqual(Object.keys(source).sort());
    for (const [key, text] of Object.entries(source)) {
      expect(translated[key]).not.toBe("");
      expect(translated[key].match(/\{[^}]+\}/g)?.sort() ?? []).toEqual(text.match(/\{[^}]+\}/g)?.sort() ?? []);
    }
    expect(backend.he).toEqual(hebrew);
  });

  it("selects Hebrew from a regional browser locale and loads Hebrew messages", async () => {
    mocks.headers.mockResolvedValue(new Headers({ "accept-language": "he-IL,he;q=0.9,en;q=0.8" }));
    const config = await requestConfig({ requestLocale: Promise.resolve(undefined) });
    expect(config.locale).toBe("he");
    expect(config.messages?.loginname).toEqual(hebrew.loginname);
    expect(mocks.translations).toHaveBeenCalledWith(expect.objectContaining({ locale: "he" }));
  });

  it("preserves the selected English cookie over the Hebrew browser locale", async () => {
    mocks.headers.mockResolvedValue(new Headers({ "accept-language": "he" }));
    mocks.cookies.mockResolvedValue({ get: () => ({ value: "en" }) });
    expect((await requestConfig({ requestLocale: Promise.resolve(undefined) })).locale).toBe("en");
  });

  it("does not select a removed language from headers, an old cookie, or the instance default", async () => {
    mocks.settings.mockResolvedValue({ allowedLanguages: ["en", "he", "de"], defaultLanguage: "de" });
    mocks.headers.mockResolvedValue(new Headers({ "accept-language": "de" }));
    mocks.cookies.mockResolvedValue({ get: () => ({ value: "de" }) });
    expect((await requestConfig({ requestLocale: Promise.resolve(undefined) })).locale).toBe("en");
  });

  it("uses Hebrew when instance restrictions allow only Hebrew", async () => {
    mocks.settings.mockResolvedValue({ allowedLanguages: ["he"], defaultLanguage: "en" });
    expect((await requestConfig({ requestLocale: Promise.resolve(undefined) })).locale).toBe("he");
  });

  it("keeps the switcher and request locale usable with a removed instance language", async () => {
    mocks.settings.mockResolvedValue({ allowedLanguages: ["de"], defaultLanguage: "de" });
    expect(getLoginLanguages(["de"])).toEqual([{ code: "en", name: "English" }]);
    expect((await requestConfig({ requestLocale: Promise.resolve(undefined) })).locale).toBe("en");
  });

  it("retains the official instance translation override", async () => {
    mocks.cookies.mockResolvedValue({ get: () => ({ value: "he" }) });
    mocks.translations.mockResolvedValue({ common: { title: "כניסה ל-Yeda" } });
    const config = await requestConfig({ requestLocale: Promise.resolve(undefined) });
    expect(config.messages?.common).toEqual({ ...hebrew.common, title: "כניסה ל-Yeda" });
  });
});
