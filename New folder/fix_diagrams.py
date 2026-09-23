import os

mmd_files = {
"08_pass_lifecycle.mmd": """stateDiagram-v2
    [*] --> pending_department_approval : Request Submitted
    pending_department_approval --> pending_approval : Dept Manager Approves
    pending_department_approval --> Rejected : Dept Manager Rejects
    pending_approval --> approved : Ops Officer Approves
    pending_approval --> Rejected : Ops Officer Rejects
    approved --> issued : Pass Officer Generates QR
    issued --> checked_in : Gate Officer Scans (Entry)
    checked_in --> checked_out : Gate Officer Scans (Exit)
    checked_out --> [*]
    Rejected --> [*]
""",
"15_role_swimlane.mmd": """sequenceDiagram
    participant R as Requester
    participant DM as Dept Manager
    participant OO as Operations Officer
    participant PO as Pass Officer
    participant GO as Gate Officer
    participant S as System
    
    R->>S: Submit Request
    S-->>DM: Pending Dept Approval
    DM->>S: Review & Approve
    S-->>OO: Pending Ops Approval
    OO->>S: Review & Classify (VIP/LMV)
    OO->>S: Approve
    S-->>PO: Approved
    PO->>S: Generate Pass & QR Code
    S-->>GO: Issued
    GO->>S: Scan QR (Check-In)
    S-->>S: Update Status (checked_in)
    GO->>S: Scan QR (Check-Out)
    S-->>S: Update Status (checked_out)
    Note over S: Audit Logs recorded for all changes
""",
"16_request_state.mmd": """stateDiagram-v2
    [*] --> pending_department_approval
    pending_department_approval --> pending_approval : Dept Approved
    pending_department_approval --> Rejected : Dept Rejected
    pending_approval --> approved : Ops Approved
    pending_approval --> Rejected : Ops Rejected
    approved --> issued : Pass Generated
    issued --> checked_in : Arrived
    checked_in --> checked_out : Departed
    checked_out --> [*]
    Rejected --> [*]
"""
}

for filename, content in mmd_files.items():
    with open(f"diagrams/{filename}", "w", encoding="utf-8") as f:
        f.write(content)
    
    # Remove old puml files if they exist
    old_puml = f"diagrams/{filename.replace('.mmd', '.puml')}"
    if os.path.exists(old_puml):
        os.remove(old_puml)

print("Updated diagram 08, 15, 16 to be Mermaid compliant.")
