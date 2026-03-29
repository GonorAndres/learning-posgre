import type {
  DelaysData,
  RevenueData,
  UtilizationData,
  OptimizationData,
  GeospatialData,
  Airport,
  Route,
  PipelineData,
  HeatmapCell,
} from "./types";

import delaysJson from "../../data/delays.json";
import revenueJson from "../../data/revenue.json";
import utilizationJson from "../../data/utilization.json";
import optimizationJson from "../../data/optimization.json";
import matViewsJson from "../../data/materialized-views.json";
import geospatialJson from "../../data/geospatial.json";
import airportsJson from "../../data/airports.json";
import routesJson from "../../data/routes.json";
import heatmapJson from "../../data/heatmap.json";
import pipelineJson from "../../data/pipeline.json";

export const delays = delaysJson as unknown as DelaysData;
export const revenue = revenueJson as unknown as RevenueData;
export const utilization = utilizationJson as unknown as UtilizationData;
export const optimization = optimizationJson as unknown as OptimizationData;
export const matViews = matViewsJson as { raw_ms: number; mv_ms: number; speedup: string };
export const geospatial = geospatialJson as unknown as GeospatialData;
export const airports = airportsJson as unknown as Airport[];
export const routes = routesJson as unknown as Route[];
export const heatmap = heatmapJson as unknown as HeatmapCell[];
export const pipeline = pipelineJson as unknown as PipelineData;
