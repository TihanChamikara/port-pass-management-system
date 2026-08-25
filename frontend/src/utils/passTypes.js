export const PASS_TYPES = [
  { value: "blue", label: "Blue", color: "#1D4ED8", zone: "Zone 1", zones: [1] },
  { value: "red", label: "Red", color: "#DC2626", zone: "Zone 2", zones: [2] },
  { value: "orange", label: "Orange", color: "#EA580C", zone: "Zone 3", zones: [3] },
  { value: "green", label: "Green", color: "#16A34A", zone: "Zone 4", zones: [4] },
  { value: "purple", label: "Purple", color: "#7C3AED", zone: null, zones: [1, 2, 3, 4] },
];

export const ZONES = ["Zone 1", "Zone 2", "Zone 3", "Zone 4"];

export function getPassTypeConfig(value) {
  return PASS_TYPES.find((item) => item.value === value) || PASS_TYPES[0];
}

export function getZoneValueForPassType(passType) {
  const config = getPassTypeConfig(passType);
  return config.zone;
}

export function isAllAccess(passType) {
  return passType === "purple";
}
