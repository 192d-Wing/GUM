// TypeScript interfaces mirroring Rust API structs in crow-server/src/api/

// --- Stats (stats.rs: ServerStats) ---
export interface ServerStats {
  zone_count: number;
  cache_size: number;
  cache_hits: number;
  cache_misses: number;
  cache_evictions: number;
  cache_expirations: number;
  metrics_text: string;
}

// --- Zones (zones.rs: ZoneSummary, CreateZoneRequest, CreateZoneResponse) ---
export interface ZoneSummary {
  name: string;
  serial: number;
  role: string;
  record_count: number;
}

export interface CreateZoneRequest {
  name: string;
  zone_data: string;
}

export interface CreateZoneResponse {
  name: string;
  serial: number;
}

// --- Records (records.rs: RecordEntry, AddRecordRequest, DeleteRecordQuery) ---
export interface RecordEntry {
  name: string;
  rtype: string;
  rclass: string;
  ttl: number;
  rdata_hex: string;
  rdata_display?: string;
}

export interface AddRecordRequest {
  name: string;
  rtype: string;
  ttl: number;
  rdata_hex: string;
}

export interface DeleteRecordQuery {
  name: string;
  rtype: string;
}

// --- Firewall (policies.rs) ---
export interface DomainListResponse {
  domains: string[];
}

export interface UpdateListRequest {
  domains: string[];
}

// --- Health (health.rs) ---
export interface HealthTargetState {
  target_id: string;
  healthy: boolean;
  consecutive_successes: number;
  consecutive_failures: number;
  latency_ms: number | null;
}

export interface HealthTargetsResponse {
  targets: HealthTargetState[];
}

// --- Catalogs (catalog.rs) ---
export interface CatalogSummary {
  name: string;
  member_count: number;
}

export interface CatalogDetail {
  name: string;
  members: string[];
}

// --- NTAs (ntas.rs) ---
export interface NtaListResponse {
  ntas: string[];
}

export interface AddNtaRequest {
  zone: string;
}

export interface NtaActionResponse {
  success: boolean;
  zone: string;
}

// --- Alerts (alerts.rs) ---
export interface AlertsResponse {
  active: string[];
  total_fired: number;
}

export interface AlertRuleSummary {
  name: string;
  metric: string;
  condition: string;
  threshold: number;
  severity: string;
}

// --- Analytics ---
export interface TopEntry {
  key: string;
  count: number;
}

// --- Users ---
export interface UserInfo {
  user_id: string;
  username: string;
  email: string | null;
  roles: string;
  mfa_enabled: boolean;
  disabled: boolean;
  created_at: number;
  expires_at: number | null;
}

export interface ListUsersResponse {
  users: UserInfo[];
}

export interface CreateUserRequest {
  username: string;
  email?: string;
  roles?: string;
  expires_in_days?: number;
}

export interface CreateUserResponse {
  user_id: string;
  username: string;
  token: string;
}

// --- Config Reload ---
export interface ReloadResponse {
  success: boolean;
  message: string;
  reloaded_zones: string[];
  failed_zones: [string, string][];
  tls_errors?: [string, string][];
}

// --- Readiness ---
export interface ReadinessResponse {
  ready: boolean;
  zones_loaded: number;
}

// --- MFA ---
export interface MfaEnrollRequest {
  username: string;
}

export interface MfaEnrollResponse {
  secret: string;
  qr_code: string;
  backup_codes: string[];
  issuer: string;
}

export interface MfaVerifyRequest {
  user_id: string;
  code: string;
}

export interface MfaVerifyResponse {
  valid: boolean;
}

// --- API Error ---
export interface ApiError {
  error: string;
}
