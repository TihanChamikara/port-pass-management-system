import os

mmd_files = {
"01_high_level_process.mmd": """graph TD
    A([Start]) --> B[Visitor Submits Request]
    B --> C[Manager Validates Request]
    C --> D{Manager Approved?}
    D -- No --> E[Reject Request]
    D -- Yes --> F[Ops Officer Validates Request]
    F --> G{Ops Approved?}
    G -- No --> E
    G -- Yes --> H[Pass Officer Generates Pass]
    H --> I[Visitor Arrives at Gate]
    I --> J[Gate Officer Scans QR]
    J --> K{Pass Valid?}
    K -- No --> L[Deny Access]
    K -- Yes --> M[Record Check-In]
    M --> N[Visitor Accesses Port]
    N --> O[Visitor Leaves]
    O --> P[Record Check-Out]
    P --> Q([End])
    E --> Q
    L --> Q
""",
"02_visitor_request.mmd": """graph TD
    A([START]) --> B[Requester opens visitor portal]
    B --> C[/Enter requester information/]
    C --> D[/Enter visitor information/]
    D --> E[/Enter visit information/]
    E --> F[/Enter vehicle/equipment details/]
    F --> G[Validate Sri Lankan NIC & Formats]
    G --> H{Validation Successful?}
    H -- No --> I[Display validation errors]
    I --> C
    H -- Yes --> J[Submit request]
    J --> K[(Database: Store Request)]
    K --> L[Status: pending_department_approval]
    L --> M([END])
""",
"03_department_approval.mmd": """graph TD
    A([START]) --> B[Department Manager logs in]
    B --> C[View pending requests queue]
    C --> D[Select request]
    D --> E[Review business need]
    E --> F{Approve Request?}
    F -- No --> G[Reject request]
    G --> H[(Update Status: Rejected)]
    H --> I([END])
    F -- Yes --> J[Approve request]
    J --> K[(Update Status: pending_approval)]
    K --> I
""",
"04_operations_review.mmd": """graph TD
    A([START]) --> B[Operations Officer logs in]
    B --> C[View department-approved requests]
    C --> D[Review detailed identity profiles]
    D --> E[Assign classifications e.g., VIP, LMV routing]
    E --> F{Request Approved?}
    F -- No --> G[Reject request]
    G --> H[(Update Status: Rejected)]
    H --> I([END])
    F -- Yes --> J[Approve request]
    J --> K[(Update Status: approved)]
    K --> I
""",
"05_pass_issuing.mmd": """graph TD
    A([START]) --> B[Pass Officer logs in]
    B --> C[View approved requests]
    C --> D[Select request]
    D --> E[Generate secure pass data]
    E --> F[Generate QR code with hashed data & zone array]
    F --> G[(Update Status: issued)]
    G --> H[Record audit event in audit_logs]
    H --> I([END])
""",
"06_gate_checkin.mmd": """graph TD
    A([START]) --> B[Gate Officer logs in]
    B --> C[Visitor arrives at gate]
    C --> D[Scan visitor QR Pass]
    D --> E[Retrieve visitor profile & status]
    E --> F{Pass Status == issued?}
    F -- No --> G[Deny Access / Prevent Double-Entry]
    G --> H([END])
    F -- Yes --> I[Record Check-In]
    I --> J[(Update Status: checked_in)]
    J --> K[Record action in audit_logs]
    K --> H
""",
"07_gate_checkout.mmd": """graph TD
    A([START]) --> B[Gate Officer identifies exiting visitor]
    B --> C[Scan QR / Lookup]
    C --> D{Status == checked_in?}
    D -- No --> E[Flag Anomaly / Prevent Check-Out]
    E --> F([END])
    D -- Yes --> G[Record Check-Out]
    G --> H[(Update Status: checked_out)]
    H --> I[Record action in audit_logs]
    I --> F
""",
"08_pass_lifecycle.puml": """stateDiagram-v2
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
"09_group_pass.mmd": """graph TD
    A([START]) --> B[Group pass request submitted]
    B --> C[/Enter group information/]
    C --> D[Validation]
    D --> E[Department & Ops Approval]
    E --> F[Pass Officer generates group passes]
    F --> G[(Update Status: issued)]
    G --> H([END])
    %% Note: Detail limited in PDF
""",
"10_reporting.mmd": """graph TD
    A([START]) --> B[Admin/Manager logs in]
    B --> C[Open Dashboard]
    C --> D[View KPIs: Awaiting Issue, Currently Inside]
    D --> E[View Zone Capacity gauges]
    E --> F[View Daily Volume charts]
    F --> G[Open Tabular Reports]
    G --> H[Filter historical pass data & audit logs]
    H --> I([END])
""",
"11_audit.mmd": """graph TD
    A([User Action e.g., LOGIN, CHECK_IN]) --> B[Backend Process]
    B --> C[(Database Transaction)]
    C --> D[Asynchronously write to audit_logs]
    D --> E[/Log fields: user_id, action, entity_type, UTC timestamp/]
    E --> F([END])
""",
"12_authentication.mmd": """graph TD
    A([START]) --> B[User enters credentials]
    B --> C[Backend authenticates vs Bcrypt hash]
    C --> D{Credentials Valid?}
    D -- No --> E[Reject/Authentication Error]
    E --> F([END])
    D -- Yes --> G[Generate stateless JWT token]
    G --> H[Identify UserRole]
    H --> I[User requests API route]
    I --> J{RBAC Authorized?}
    J -- No --> K[Access Denied]
    K --> F
    J -- Yes --> L[Grant Access]
    L --> F
""",
"13_architecture.mmd": """graph TD
    A[OFFICE USERS] -->|Network| B[React 18 SPA / Vite]
    B -->|HTTP/JWT| C[FastAPI REST API / Uvicorn]
    C -->|SQLAlchemy ORM| D[(PostgreSQL 18 DB)]
""",
"14_lan_deployment.mmd": """graph TD
    A[Central Office PC<br/>10.170.82.8]
    A --> B[FastAPI Port 8000]
    A --> C[PostgreSQL Port 5432]
    A --> D[Vite Assets Port 5173]
    
    E[Office LAN]
    E -->|TCP 5173 / 8000| A
    
    F[HR PC Browser] --> E
    G[Ops PC Browser] --> E
    H[Gate Tablet Browser] --> E
""",
"15_role_swimlane.puml": """|Requester|
start
:Submit Request;
|Department Manager|
:Review Request;
if (Approve?) then (yes)
  |Operations Officer|
  :Review & Classify (VIP/LMV);
  if (Approve?) then (yes)
    |Pass Officer|
    :Generate Pass;
    :Issue QR Code;
    |Gate Officer|
    :Scan QR (Check-In);
    :Scan QR (Check-Out);
  else (no)
    |Operations Officer|
    :Reject Request;
    stop
  endif
else (no)
  |Department Manager|
  :Reject Request;
  stop
endif
|System|
:Record Audit_Logs for state changes;
stop
""",
"16_request_state.puml": """stateDiagram-v2
    %% Covered in diagram 8, creating duplicate for specific requirement
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

os.makedirs('diagrams', exist_ok=True)
for filename, content in mmd_files.items():
    with open(f"diagrams/{filename}", "w", encoding="utf-8") as f:
        f.write(content)

print("Created all diagram source files.")
