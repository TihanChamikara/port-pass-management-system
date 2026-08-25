"""
QR Code Generation Service: Generate QR codes for visitor passes.
"""

import json
import hashlib
from datetime import datetime, timedelta
from typing import Optional

try:
    import qrcode
    HAS_QRCODE = True
except ImportError:
    HAS_QRCODE = False


class QRPassData:
    """Data structure for QR code embedded information."""
    
    def __init__(
        self,
        pass_record_id: int,
        visitor_name: str,
        zones: list[str],
        valid_from: datetime,
        valid_until: datetime,
        request_id: Optional[str] = None,
    ):
        self.pass_record_id = pass_record_id
        self.visitor_name = visitor_name
        self.zones = zones
        self.valid_from = valid_from
        self.valid_until = valid_until
        self.request_id = request_id
        self.generated_at = datetime.utcnow()

    def to_json(self) -> str:
        """Serialize to JSON for QR encoding."""
        return json.dumps({
            "pass_id": self.pass_record_id,
            "visitor": self.visitor_name,
            "zones": self.zones,
            "valid_from": self.valid_from.isoformat(),
            "valid_until": self.valid_until.isoformat(),
            "request_id": self.request_id,
            "generated": self.generated_at.isoformat(),
        })

    def to_compact_string(self) -> str:
        """Generate compact string for verification without decoding full JSON."""
        content = f"{self.pass_record_id}|{self.visitor_name}|{','.join(self.zones)}"
        signature = hashlib.sha256(content.encode()).hexdigest()[:8]
        return f"{content}|{signature}"


def generate_qr_code(pass_data: QRPassData, output_file: Optional[str] = None) -> Optional[str]:
    """
    Generate QR code from pass data.
    
    Args:
        pass_data: QRPassData object with pass information
        output_file: Optional file path to save QR code image
    
    Returns:
        Base64 encoded QR code image string (for API response) or file path (if output_file specified)
    """
    if not HAS_QRCODE:
        return None

    try:
        # Create QR code with pass data as JSON
        qr = qrcode.QRCode(
            version=2,  # Auto-adjust if needed
            error_correction=qrcode.constants.ERROR_CORRECT_H,  # High error correction
            box_size=10,
            border=4,
        )
        qr.add_data(pass_data.to_json())
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        if output_file:
            img.save(output_file)
            return output_file
        else:
            # Return as base64 for API
            import base64
            from io import BytesIO
            
            buffer = BytesIO()
            img.save(buffer, format="PNG")
            buffer.seek(0)
            img_base64 = base64.b64encode(buffer.getvalue()).decode()
            return f"data:image/png;base64,{img_base64}"

    except Exception as e:
        print(f"Error generating QR code: {e}")
        return None


def verify_qr_data(json_data: str) -> Optional[QRPassData]:
    """
    Verify and parse QR code JSON data at gate.
    Used by Security Gate Officer to validate passes.
    """
    try:
        data = json.loads(json_data)
        
        # Validate required fields
        required_fields = ["pass_id", "visitor", "zones", "valid_from", "valid_until"]
        if not all(field in data for field in required_fields):
            return None

        return QRPassData(
            pass_record_id=data["pass_id"],
            visitor_name=data["visitor"],
            zones=data["zones"],
            valid_from=datetime.fromisoformat(data["valid_from"]),
            valid_until=datetime.fromisoformat(data["valid_until"]),
            request_id=data.get("request_id"),
        )
    except Exception as e:
        print(f"Error parsing QR data: {e}")
        return None


def is_pass_valid(qr_data: QRPassData) -> bool:
    """Check if pass is currently valid (not expired)."""
    now = datetime.utcnow()
    return qr_data.valid_from <= now <= qr_data.valid_until


def get_zone_access(qr_data: QRPassData, requested_zone: str) -> bool:
    """Check if QR pass allows access to requested zone."""
    return requested_zone in qr_data.zones
