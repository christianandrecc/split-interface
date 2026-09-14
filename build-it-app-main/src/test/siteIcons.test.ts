import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = new DOMParser().parseFromString(readFileSync("index.html", "utf8"), "text/html");
const manifest = JSON.parse(readFileSync("public/site.webmanifest", "utf8"));

function publicAsset(url: string) {
  return readFileSync(`public${new URL(url, "https://split.example").pathname}`);
}

function pngSize(bytes: Buffer) {
  expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`;
}

describe("SPLIT browser icons", () => {
  it("versions every browser icon and the manifest to bypass the old logo cache", () => {
    const links = [...html.querySelectorAll<HTMLLinkElement>('link[rel*="icon"], link[rel="manifest"]')];
    expect(links).toHaveLength(6);
    links.forEach((link) => {
      expect(new URL(link.href, "https://split.example").searchParams.get("v")).toBe("20260914");
      expect(publicAsset(link.getAttribute("href")!).length).toBeGreaterThan(0);
    });
  });

  it("provides PNG files at their declared favicon and home-screen dimensions", () => {
    html.querySelectorAll<HTMLLinkElement>('link[type="image/png"], link[rel="apple-touch-icon"]').forEach((link) => {
      expect(pngSize(publicAsset(link.getAttribute("href")!))).toBe(link.getAttribute("sizes"));
    });
    expect(manifest.icons).toHaveLength(2);
    manifest.icons.forEach((icon: { src: string; sizes: string; type: string }) => {
      expect(icon.type).toBe("image/png");
      expect(new URL(icon.src, "https://split.example").searchParams.get("v")).toBe("20260914");
      expect(pngSize(publicAsset(icon.src))).toBe(icon.sizes);
    });
  });

  it("keeps browser fallback filenames identical to the new linked icons", () => {
    for (const name of ["favicon.ico", "favicon-16x16.png", "favicon-32x32.png", "apple-touch-icon.png", "android-chrome-192x192.png", "android-chrome-512x512.png"]) {
      expect(publicAsset(`/${name}`)).toEqual(publicAsset(`/split-${name}`));
    }
    const ico = publicAsset("/favicon.ico");
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(1);
    expect([ico[6], ico[7]]).toEqual([32, 32]);
  });
});
