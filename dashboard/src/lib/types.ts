// === Delays ===
export interface DatasetOverview {
  total_flights: number;
  arrived: number;
  cancelled: number;
  scheduled: number;
  in_progress: number;
}

export interface RouteDelay {
  departure: string;
  arrival: string;
  total_flights: number;
  delayed_flights: number;
  delay_pct: number;
  avg_delay_min: number;
}

export interface AirportDelay {
  code: string;
  airport: string;
  city: string;
  total_flights: number;
  delayed: number;
  delay_pct: number;
  avg_delay_all_min: number;
  avg_delay_late_min: number;
}

export interface DelayByHour {
  hour_local: number;
  flights: number;
  delayed: number;
  delay_pct: number;
  avg_offset_min: number;
}

export interface DelayByDay {
  day_of_week: number;
  day_name: string;
  flights: number;
  delay_pct: number;
}

export interface DelayByAircraft {
  aircraft: string;
  max_range_km: number;
  total_flights: number;
  delay_pct: number;
  avg_offset_min: number;
}

export interface HeatmapCell {
  dow: number;
  hour_local: number;
  flights: number;
  delay_pct: number;
  day_name: string;
}

export interface DelaysData {
  overview: DatasetOverview;
  topRoutes: RouteDelay[];
  worstAirports: AirportDelay[];
  byHour: DelayByHour[];
  byDay: DelayByDay[];
  byAircraft: DelayByAircraft[];
}

// === Revenue ===
export interface FareClassRevenue {
  fare_class: string;
  tickets_sold: number;
  total_revenue_rub: number;
  avg_ticket_rub: number;
  revenue_pct: number;
  ticket_pct: number;
}

export interface RouteRevenue {
  departure: string;
  arrival: string;
  flights: number;
  passengers: number;
  total_revenue_rub: number;
  avg_ticket_rub: number;
  revenue_per_flight: number;
}

export interface ParetoRoute {
  rank: number;
  route: string;
  revenue_rub: number;
  cumul_pct: number;
}

export interface ParetoSummary {
  total_routes: number;
  routes_for_50pct: number;
  routes_for_80pct: number;
  total_revenue_rub: number;
}

export interface MonthlyTrend {
  month: string;
  flights: number;
  passengers: number;
  revenue_rub: number;
  avg_ticket_rub: number;
  mom_change_pct: number | null;
}

export interface RevenueData {
  byFareClass: FareClassRevenue[];
  topRoutes: RouteRevenue[];
  pareto: ParetoRoute[];
  paretoSummary: ParetoSummary;
  monthlyTrend: MonthlyTrend[];
}

// === Utilization ===
export interface FleetOverview {
  aircraft: string;
  max_range_km: number;
  total_flights: number;
  total_flight_hours: number;
  avg_duration_min: number;
}

export interface LoadFactor {
  aircraft: string;
  flights: number;
  avg_passengers: number;
  capacity: number;
  avg_load_factor_pct: number;
}

export interface TurnaroundTime {
  aircraft: string;
  turnaround_count: number;
  avg_turnaround_min: number;
  median: number;
  min: number;
  p90: number;
}

export interface LoadByDay {
  dow: number;
  day_name: string;
  flights: number;
  avg_passengers: number;
  avg_load_pct: number;
}

export interface SeatCapacity {
  aircraft: string;
  economy_seats: number;
  comfort_seats: number;
  business_seats: number;
  total_seats: number;
}

export interface UtilizationData {
  fleet: FleetOverview[];
  seatCapacity: SeatCapacity[];
  loadFactor: LoadFactor[];
  worstRoutes: Record<string, unknown>[];
  turnaround: TurnaroundTime[];
  loadByDay: LoadByDay[];
}

// === Geospatial ===
export interface DistanceBucket {
  distance_bucket: string;
  routes: number;
  total_flights: number;
  delay_pct: number;
  avg_distance_km: number;
}

export interface AirportHub {
  code: string;
  airport: string;
  city: string;
  destinations: number;
  total_departures: number;
  avg_route_km: number;
}

export interface GeospatialData {
  longestRoutes: { departure: string; dep_city: string; arrival: string; arr_city: string; distance_km: number; total_flights: number }[];
  delayByDistance: DistanceBucket[];
  hubs: AirportHub[];
}

// === Optimization ===
export interface QuerySpeedup {
  query: string;
  before_ms: number;
  after_ms: number;
  speedup: string;
}

export interface IndexSize {
  index_name: string;
  index_size: string;
  times_used: number;
}

export interface TableSize {
  table_name: string;
  total_size: string;
  data_size: string;
  index_size: string;
  live_rows: number;
}

export interface OptimizationData {
  indexes: Record<string, unknown>[];
  speedups: QuerySpeedup[];
  indexSizes: IndexSize[];
  tableSizes: TableSize[];
}

// === Map ===
export interface Airport {
  code: string;
  name: string;
  city: string;
  lon: number;
  lat: number;
  timezone: string;
  departures: number;
  destinations: number;
}

export interface Route {
  dep: string;
  arr: string;
  dep_lon: number;
  dep_lat: number;
  arr_lon: number;
  arr_lat: number;
  flights: number;
  delay_pct: number;
}

// === Pipeline ===
export interface PerfComparison {
  query: string;
  pg_no_index: string;
  pg_with_index: string;
  bigquery: string;
  bq_bytes: string;
}

export interface SyntaxDiff {
  concept: string;
  postgresql: string;
  bigquery: string;
}

export interface ArchDiff {
  dimension: string;
  postgresql: string;
  bigquery: string;
}

export interface EtlMetrics {
  total_rows: number;
  tables: number;
  duration_seconds: number;
  throughput_rows_per_sec: number;
}

export interface PipelineData {
  performance: PerfComparison[];
  syntax: SyntaxDiff[];
  architecture: ArchDiff[];
  etl: EtlMetrics;
}
