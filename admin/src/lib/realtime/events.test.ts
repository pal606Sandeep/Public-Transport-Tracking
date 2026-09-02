import { toVehiclePatch, RT_EVENTS } from "./events";

describe("toVehiclePatch", () => {
  it("normalises the socket shape (latitude/longitude)", () => {
    const p = toVehiclePatch("vehicle:location", {
      vehicleId: "v1",
      latitude: 12.97,
      longitude: 77.59,
      speed: 30,
      heading: 90,
      timestamp: 1000,
    });
    expect(p).toMatchObject({
      vehicleId: "v1",
      lat: 12.97,
      lng: 77.59,
      speed: 30,
      heading: 90,
      updatedAt: 1000,
    });
  });

  it("also accepts lat/lon/lng and string numbers", () => {
    const p = toVehiclePatch("vehicle:location", {
      vehicle: "v2",
      lat: "1.5",
      lon: "2.5",
    });
    expect(p).toMatchObject({ vehicleId: "v2", lat: 1.5, lng: 2.5 });
  });

  it("returns null without a vehicle id", () => {
    expect(toVehiclePatch("vehicle:location", { latitude: 1, longitude: 2 })).toBeNull();
  });

  it("carries status / occupancy / delay fields when present", () => {
    const p = toVehiclePatch("vehicle:occupancy", {
      vehicleId: "v3",
      occupancyLevel: "CROWDED",
      delayStatus: "LATE",
      routeId: "r1",
    });
    expect(p).toMatchObject({
      occupancyLevel: "CROWDED",
      delayStatus: "LATE",
      routeId: "r1",
    });
  });

  it("RT_EVENTS lists the expected server events", () => {
    expect(RT_EVENTS).toContain("vehicle:location");
    expect(RT_EVENTS).toContain("vehicle:occupancy");
  });
});
