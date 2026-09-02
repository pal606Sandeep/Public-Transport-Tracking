import { parseTimes, scheduleFormSchema } from "./schedule.validation";

describe("parseTimes", () => {
  it("splits a comma list and trims", () => {
    expect(parseTimes("06:00, 07:30,09:00")).toEqual([
      "06:00",
      "07:30",
      "09:00",
    ]);
  });

  it("drops empties", () => {
    expect(parseTimes("06:00,, ,07:30")).toEqual(["06:00", "07:30"]);
  });
});

describe("scheduleFormSchema", () => {
  const base = {
    name: "Weekday AM",
    route: "6a".padEnd(24, "b"),
    departureTimes: "06:00, 07:30",
  };

  it("accepts a valid form", () => {
    expect(scheduleFormSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a missing route", () => {
    const r = scheduleFormSchema.safeParse({ ...base, route: "" });
    expect(r.success).toBe(false);
  });

  it("rejects non-HH:MM departure times", () => {
    for (const bad of ["6:00", "25:00", "06:60", "0600", "abc"]) {
      const r = scheduleFormSchema.safeParse({
        ...base,
        departureTimes: bad,
      });
      expect(r.success).toBe(false);
    }
  });

  it("defaults frequency, duration and isActive", () => {
    const r = scheduleFormSchema.parse(base);
    expect(r.frequencyType).toBe("DAILY");
    expect(r.durationMin).toBe(60);
    expect(r.isActive).toBe(true);
  });
});
