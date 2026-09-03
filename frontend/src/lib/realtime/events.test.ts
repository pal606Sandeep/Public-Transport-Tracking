import { toVehiclePatch, RT_EVENTS } from "./events";

describe("toVehiclePatch", () => {
  it("returns null when there is no vehicle id", () => {
    expect(toVehiclePatch("vehicle:location", {})).toBeNull();
  });

  it("reads the socket shape (latitude/longitude, string values)", () => {
    const patch = toVehiclePatch("vehicle:location", {
      vehicleId: "v1",
      latitude: "18.52",
      longitude: "73.85",
      timestamp: 1000,
    });
    expect(patch).toMatchObject({ vehicleId: "v1", lat: 18.52, lng: 73.85, updatedAt: 1000 });
  });

  it("accepts the REST-ish shape (vehicle, lat/lon)", () => {
    const patch = toVehiclePatch("vehicle:location", {
      vehicle: "v2",
      lat: 1,
      lon: 2,
    });
    expect(patch).toMatchObject({ vehicleId: "v2", lat: 1, lng: 2 });
  });

  it("passes through occupancy and delay fields when present", () => {
    const patch = toVehiclePatch("vehicle:occupancy", {
      vehicleId: "v3",
      occupancyLevel: "CRUSHED",
      delayStatus: "LATE",
      eta: 120,
    });
    expect(patch).toMatchObject({
      occupancyLevel: "CRUSHED",
      delayStatus: "LATE",
      etaSeconds: 120,
    });
  });

  it("omits coordinates that aren't finite numbers", () => {
    const patch = toVehiclePatch("vehicle:location", {
      vehicleId: "v4",
      latitude: "not-a-number",
    });
    expect(patch).not.toHaveProperty("lat");
  });

  it("RT_EVENTS lists the known server event names", () => {
    expect(RT_EVENTS).toContain("vehicle:location");
    expect(RT_EVENTS).toContain("vehicle:arrived");
  });
});
