import { parseGeometryText, geometryToText } from "./route.validation";

describe("parseGeometryText", () => {
  it("parses one 'lng,lat' per line into a LineString", () => {
    const g = parseGeometryText("77.5946,12.9716\n77.61,12.98");
    expect(g).toEqual({
      type: "LineString",
      coordinates: [
        [77.5946, 12.9716],
        [77.61, 12.98],
      ],
    });
  });

  it("tolerates blank lines and surrounding whitespace", () => {
    const g = parseGeometryText("  77.5946, 12.9716 \n\n 77.61,12.98 \n");
    expect(g?.coordinates).toHaveLength(2);
  });

  it("returns null for empty / whitespace input", () => {
    expect(parseGeometryText("")).toBeNull();
    expect(parseGeometryText("   \n  ")).toBeNull();
    expect(parseGeometryText(undefined)).toBeNull();
  });

  it("throws when a line is not 'lng,lat'", () => {
    expect(() => parseGeometryText("77.5946")).toThrow();
    expect(() => parseGeometryText("a,b")).toThrow();
    expect(() => parseGeometryText("1,2,3")).toThrow();
  });

  it("throws when fewer than 2 points", () => {
    expect(() => parseGeometryText("77.5946,12.9716")).toThrow(/2 points/);
  });
});

describe("geometryToText", () => {
  it("renders coordinates back to text", () => {
    expect(
      geometryToText({
        coordinates: [
          [77.5946, 12.9716],
          [77.61, 12.98],
        ],
      })
    ).toBe("77.5946,12.9716\n77.61,12.98");
  });

  it("is empty for null / no geometry", () => {
    expect(geometryToText(null)).toBe("");
    expect(geometryToText(undefined)).toBe("");
  });

  it("round-trips with parseGeometryText", () => {
    const text = "77.5946,12.9716\n77.61,12.98\n77.62,12.99";
    expect(geometryToText(parseGeometryText(text))).toBe(text);
  });
});
