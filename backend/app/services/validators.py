import re

NIC_PATTERN = re.compile(r"^(?:\d{9}[VXvx]|\d{12})$")
PHONE_PATTERN = re.compile(r"^(?:\+94|0)\d{9}$")


def is_valid_sri_lankan_nic(value: str) -> bool:
    return bool(NIC_PATTERN.fullmatch(value.strip()))


def is_valid_phone_number(value: str) -> bool:
    return bool(PHONE_PATTERN.fullmatch(value.strip()))
