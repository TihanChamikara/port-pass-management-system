CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(100) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'staff'))
);

CREATE TABLE passes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sr_no INTEGER NOT NULL UNIQUE,
  pass_no VARCHAR(40) NOT NULL UNIQUE,
  visitor_name VARCHAR(150) NOT NULL,
  company_name VARCHAR(150) NOT NULL,
  nic_number VARCHAR(20) NOT NULL,
  contact_number VARCHAR(20) NOT NULL,
  zone VARCHAR(20) NOT NULL CHECK (zone IN ('Zone 1', 'Zone 2', 'Zone 3', 'Zone 4')),
  issued_time TIMESTAMP NOT NULL,
  received_time TIMESTAMP NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'completed'))
);

CREATE INDEX idx_passes_issued_time ON passes (issued_time);
CREATE INDEX idx_passes_zone ON passes (zone);
CREATE INDEX idx_passes_status ON passes (status);
CREATE INDEX idx_passes_visitor_name ON passes (visitor_name);
CREATE INDEX idx_passes_nic_number ON passes (nic_number);

CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  details VARCHAR(255) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_audit_logs_username ON audit_logs (username);
CREATE INDEX idx_audit_logs_action ON audit_logs (action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at);
