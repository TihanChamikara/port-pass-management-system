from app.models.pass_record import PASS_TYPE_ALLOWED_ZONES, PassType, Zone, check_access, get_allowed_zones, get_zone_number

PASS_TYPE_ZONE_MAP: dict[PassType, Zone | None] = {
    PassType.blue: Zone.zone_1,
    PassType.red: Zone.zone_2,
    PassType.orange: Zone.zone_3,
    PassType.green: Zone.zone_4,
    PassType.purple: None,
}

PASS_TYPE_LABELS: dict[PassType, str] = {
    PassType.blue: "Blue",
    PassType.red: "Red",
    PassType.orange: "Orange",
    PassType.green: "Green",
    PassType.purple: "Purple",
}

PASS_TYPE_COLORS: dict[PassType, str] = {
    PassType.blue: "#1D4ED8",
    PassType.red: "#DC2626",
    PassType.orange: "#EA580C",
    PassType.green: "#16A34A",
    PassType.purple: "#7C3AED",
}


def derive_zone(pass_type: PassType) -> Zone | None:
    return PASS_TYPE_ZONE_MAP[pass_type]


def derive_allowed_zones(pass_type: PassType) -> list[int]:
    return PASS_TYPE_ALLOWED_ZONES[pass_type]
