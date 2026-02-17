// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

// =====================================================================
// GUM Fleet / Deployment types (GUM backend)
// =====================================================================

export type ServiceType = "crow_dns" | "ntp";
export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";
export type DeploymentAuthType = "none" | "bearer_token" | "basic_auth";

export interface Deployment {
  id: string;
  name: string;
  service_type: ServiceType;
  endpoint_url: string;
  health_status: HealthStatus;
  last_seen: string | null;
  created_at: string;
  tags: Record<string, string>;
  auth_type?: DeploymentAuthType;
}

export interface CreateDeploymentRequest {
  name: string;
  service_type: ServiceType;
  endpoint_url: string;
  tags?: Record<string, string>;
  auth_type?: DeploymentAuthType;
  auth_credential?: string;
}

export interface UpdateDeploymentRequest {
  name?: string;
  endpoint_url?: string;
  tags?: Record<string, string>;
  auth_type?: DeploymentAuthType;
  auth_credential?: string;
}

export interface FleetHealth {
  total: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
  unknown: number;
  deployments: DeploymentHealthSummary[];
}

export interface DeploymentHealthSummary {
  id: string;
  name: string;
  service_type: ServiceType;
  health_status: HealthStatus;
  last_seen: string | null;
}

export interface FleetTopEntry {
  key: string;
  count: number;
  deployments: string[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor_sub: string;
  actor_name: string;
  action: string;
  resource_type: string;
  resource_id: string;
  resource_name: string;
  details: Record<string, unknown>;
}

export interface AuditLogPage {
  items: AuditLog[];
  total: number;
}

// =====================================================================
// Crow DNS types (mirroring crow-server/src/api/)
// =====================================================================

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

// =====================================================================
// NTP Server types (ntp_usg-server API)
// =====================================================================

// --- NTP Config ---
export interface NtpServerConfig {
  listen_addresses: string[];
  stratum: number;
  reference_id: string;
  max_clients: number;
  rate_limit: number;
}

// --- NTP Sources ---
export interface NtpSource {
  id: string;
  address: string;
  stratum: number;
  state: "synced" | "reachable" | "unreachable" | "unknown";
}

export interface NtpSourceDetail {
  id: string;
  address: string;
  stratum: number;
  reach: number;
  delay: number;
  offset: number;
  jitter: number;
  state: "synced" | "reachable" | "unreachable" | "unknown";
  poll_interval: number;
  last_poll: string | null;
}

export interface CreateNtpSourceRequest {
  address: string;
}

// --- NTP Sync Status ---
export interface NtpSyncStatus {
  synchronized: boolean;
  stratum: number;
  offset: number;
  jitter: number;
  sync_source: string | null;
  leap_indicator: number;
  precision: number;
  root_delay: number;
  root_dispersion: number;
}

// --- NTP Stats ---
export interface NtpServerStats {
  total_requests: number;
  requests_per_second: number;
  source_count: number;
  active_clients: number;
}

// --- NTP Access Control ---
export interface IpRangeList {
  ranges: string[];
}

// =====================================================================
// Auth types (GUM backend SSO/OIDC)
// =====================================================================

export interface AuthUser {
  authenticated: boolean;
  sub: string;
  name: string;
  email: string;
  roles: string[];
}

// --- API Error ---
export interface ApiError {
  error: string;
}
