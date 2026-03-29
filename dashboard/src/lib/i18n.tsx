"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type Lang = "en" | "es";

interface I18nContext {
  lang: Lang;
  toggle: () => void;
  t: (key: string) => string;
}

const I18nCtx = createContext<I18nContext>({
  lang: "en",
  toggle: () => {},
  t: (key: string) => key,
});

export function useI18n() {
  return useContext(I18nCtx);
}

const translations: Record<string, Record<Lang, string>> = {
  // Nav
  "nav.map": { en: "MAP", es: "MAPA" },
  "nav.overview": { en: "OVERVIEW", es: "RESUMEN" },
  "nav.delays": { en: "DELAYS", es: "RETRASOS" },
  "nav.revenue": { en: "REVENUE", es: "INGRESOS" },
  "nav.fleet": { en: "FLEET", es: "FLOTA" },
  "nav.internals": { en: "PG INTERNALS", es: "PG INTERNOS" },
  "nav.pipeline": { en: "PIPELINE", es: "PIPELINE" },

  // Overview page
  "overview.title": { en: "FLIGHT//DB", es: "FLIGHT//DB" },
  "overview.desc": {
    en: "5.74M rows of Russian airline data analyzed in PostgreSQL 16, migrated to BigQuery, visualized interactively. A deep dive into query optimization, indexing strategies, and data pipeline engineering.",
    es: "5.74M registros de datos reales de aerolíneas rusas analizados en PostgreSQL 16, migrados a BigQuery y visualizados de forma interactiva. Un análisis a fondo sobre optimización de consultas, estrategias de indexación e ingeniería de pipelines de datos.",
  },
  "overview.kpi.rows": { en: "Total rows analyzed", es: "Registros analizados" },
  "overview.kpi.airports": { en: "Russian airports", es: "Aeropuertos rusos" },
  "overview.kpi.revenue": { en: "Total revenue (RUB)", es: "Ingresos totales (RUB)" },
  "overview.kpi.delay": { en: "Avg delay rate", es: "Tasa promedio de retraso" },
  "overview.kpi.speedup": { en: "Mat view speedup", es: "Aceleración vista mat." },
  "overview.kpi.etl": { en: "ETL migration (sec)", es: "Migración ETL (seg)" },
  "overview.kpi.arrived": { en: "Flights arrived", es: "Vuelos completados" },
  "overview.kpi.routes": { en: "Routes mapped", es: "Rutas mapeadas" },
  "overview.card.map": { en: "ROUTE MAP", es: "MAPA DE RUTAS" },
  "overview.card.map.desc": { en: "104 airports, 532 routes on an interactive WebGL map", es: "104 aeropuertos, 532 rutas en un mapa interactivo WebGL" },
  "overview.card.delays": { en: "DELAY ANALYSIS", es: "ANÁLISIS DE RETRASOS" },
  "overview.card.delays.desc": { en: "Heatmaps, worst routes, aircraft and time-of-day patterns", es: "Mapas de calor, peores rutas, patrones por aeronave y hora del día" },
  "overview.card.revenue": { en: "REVENUE", es: "INGRESOS" },
  "overview.card.revenue.desc": { en: "Pareto curves, fare class split, monthly trends", es: "Curvas de Pareto, distribución por clase, tendencias mensuales" },
  "overview.card.fleet": { en: "FLEET", es: "FLOTA" },
  "overview.card.fleet.desc": { en: "Load factors, turnaround times, seat configurations", es: "Factores de ocupación, tiempos de rotación, configuraciones de asientos" },
  "overview.card.internals": { en: "PG INTERNALS", es: "PG INTERNOS" },
  "overview.card.internals.desc": { en: "EXPLAIN plans, index strategies, partitioning, VACUUM", es: "Planes EXPLAIN, estrategias de índice, particionamiento, VACUUM" },
  "overview.card.pipeline": { en: "ETL PIPELINE", es: "PIPELINE ETL" },
  "overview.card.pipeline.desc": { en: "PostgreSQL to BigQuery migration + performance comparison", es: "Migración de PostgreSQL a BigQuery + comparación de rendimiento" },

  // Map page
  "map.color": { en: "COLOR:", es: "COLOR:" },
  "map.routes": { en: "ROUTES:", es: "RUTAS:" },
  "map.delay": { en: "DELAY", es: "RETRASO" },
  "map.flights": { en: "FLIGHTS", es: "VUELOS" },
  "map.clear": { en: "CLEAR", es: "LIMPIAR" },
  "map.airports": { en: "airports", es: "aeropuertos" },
  "map.routesLabel": { en: "routes", es: "rutas" },
  "map.topHubs": { en: "TOP HUBS", es: "HUBS PRINCIPALES" },
  "map.longestRoutes": { en: "LONGEST ROUTES", es: "RUTAS MÁS LARGAS" },
  "map.legend": { en: "LEGEND", es: "LEYENDA" },
  "map.summary": {
    en: "Russia spans 11 time zones and 104 commercial airports. Three Moscow hubs (DME, SVO, VKO) anchor the entire network, with 131 destinations between them. As you move east, connectivity thins dramatically: Anadyr and Magadan hang by a single arc each. The color gradient tells the delay story at a glance: green corridors run smoothly, red arcs signal chronic operational strain.",
    es: "Rusia se extiende por 11 husos horarios y 104 aeropuertos comerciales. Tres hubs de Moscú (DME, SVO, VKO) sostienen toda la red, con 131 destinos entre los tres. Conforme te mueves hacia el este, la conectividad se adelgaza de golpe: Anádyr y Magadán cuelgan de un solo arco cada uno. El gradiente de color cuenta la historia de los retrasos de un vistazo: los corredores verdes fluyen sin problema, los arcos rojos señalan tensión operativa crónica.",
  },

  // Delays page
  "delays.title": { en: "DELAY ANALYSIS", es: "ANÁLISIS DE RETRASOS" },
  "delays.summary": {
    en: "Out of 49,235 completed flights, 2,394 departed more than 15 minutes late. None of them recovered the lost time in the air. Wednesdays and Fridays at peak hours (12:00-16:00) concentrate the worst rates. The Airbus A321-200 leads delay frequency at 5.9%, nearly double the A319-100. The pattern is clear: congestion at high-traffic hours plus tight turnaround scheduling leaves zero margin for recovery.",
    es: "De los 49,235 vuelos completados, 2,394 salieron con más de 15 minutos de retraso. Ninguno recuperó el tiempo perdido en el aire. Los miércoles y viernes en horas pico (12:00 a 16:00) concentran las peores tasas. El Airbus A321-200 encabeza la frecuencia de demoras con 5.9%, casi el doble que el A319-100. El patrón es claro: congestión en horarios de alto tráfico más una programación de rotación muy ajustada no dejan ningún margen para recuperarse.",
  },
  "delays.kpi.overall": { en: "Overall delay rate", es: "Tasa general de retraso" },
  "delays.kpi.total": { en: "Total delayed flights", es: "Vuelos retrasados totales" },
  "delays.kpi.worst": { en: "Worst route delay %", es: "Peor % de retraso en ruta" },
  "delays.kpi.recovery": { en: "Delay recovery rate", es: "Tasa de recuperación" },
  "delays.heatmap": { en: "Delay Heatmap", es: "Mapa de calor de retrasos" },
  "delays.heatmap.sub": { en: "Percentage of flights delayed >15 min by hour and day of week", es: "Porcentaje de vuelos con retraso >15 min por hora y día de la semana" },
  "delays.byAircraft": { en: "Delay Rate by Aircraft Type", es: "Tasa de retraso por tipo de aeronave" },
  "delays.byDistance": { en: "Delay Rate by Distance", es: "Tasa de retraso por distancia" },
  "delays.topRoutes": { en: "Top 20 Most Delayed Routes", es: "Las 20 rutas con más retrasos" },
  "delays.topRoutes.sub": { en: "Routes with >50 flights", es: "Rutas con más de 50 vuelos" },

  // Revenue page
  "revenue.title": { en: "REVENUE DEEP DIVE", es: "ANÁLISIS DE INGRESOS" },
  "revenue.summary": {
    en: "37.7 billion rubles flow through 451 routes, but the distribution is radically uneven. Just 38 routes generate half of all revenue. The Moscow-Khabarovsk corridor alone pulls in 1.4B RUB, with an average ticket price of 78,280 RUB. Meanwhile, Business class passengers represent only 10% of tickets but capture 26.5% of total revenue. The Pareto curve below bends sharply: by route 128, you have already accounted for 80% of income.",
    es: "37.7 mil millones de rublos fluyen a través de 451 rutas, pero la distribución es radicalmente desigual. Apenas 38 rutas generan la mitad de todos los ingresos. Solo el corredor Moscú-Jabárovsk recauda 1.4B RUB, con un precio promedio por boleto de 78,280 RUB. Por otro lado, los pasajeros de clase Business representan apenas el 10% de los boletos, pero capturan el 26.5% del ingreso total. La curva de Pareto de abajo se dobla con fuerza: para la ruta número 128, ya se ha contabilizado el 80% del ingreso.",
  },
  "revenue.kpi.total": { en: "Total revenue (RUB)", es: "Ingresos totales (RUB)" },
  "revenue.kpi.avg": { en: "Avg ticket price", es: "Precio promedio del boleto" },
  "revenue.kpi.pareto80": { en: "Routes for 80% revenue", es: "Rutas para el 80% del ingreso" },
  "revenue.kpi.totalRoutes": { en: "Total routes", es: "Total de rutas" },
  "revenue.pareto": { en: "Revenue Pareto Curve", es: "Curva de Pareto de ingresos" },
  "revenue.pareto.sub": { en: "Cumulative revenue % by route rank", es: "% acumulado de ingresos por posición de ruta" },
  "revenue.fareClass": { en: "Revenue by Fare Class", es: "Ingresos por clase tarifaria" },
  "revenue.monthly": { en: "Monthly Revenue Trend", es: "Tendencia mensual de ingresos" },
  "revenue.topRoutes": { en: "Top 20 Routes by Revenue", es: "Las 20 rutas con más ingresos" },

  // Fleet page
  "fleet.title": { en: "FLEET & UTILIZATION", es: "FLOTA Y UTILIZACIÓN" },
  "fleet.summary": {
    en: "Eight aircraft types serve this network, and they live very different lives. The Boeing 777-300 fills 72.8% of its 402 seats on average, the workhorse of long-haul profitability. At the other extreme, the Cessna 208 Caravan flies 13,789 routes but carries fewer than 2 passengers per flight on average, a 16% load factor that only makes sense as a connectivity lifeline to remote airports. Turnaround tells another story: the A319-100 averages just 13 minutes on the ground, while the 777 needs nearly 6 hours between flights.",
    es: "Ocho tipos de aeronave operan en esta red, y cada uno vive una realidad muy distinta. El Boeing 777-300 llena en promedio el 72.8% de sus 402 asientos: es el motor de la rentabilidad en rutas de largo alcance. En el otro extremo, el Cessna 208 Caravan vuela 13,789 rutas pero lleva menos de 2 pasajeros por vuelo en promedio, un factor de ocupación del 16% que solo tiene sentido como línea de vida hacia aeropuertos remotos. Los tiempos de rotación cuentan otra historia: el A319-100 promedia apenas 13 minutos en tierra, mientras que el 777 necesita casi 6 horas entre vuelos.",
  },
  "fleet.kpi.types": { en: "Aircraft types", es: "Tipos de aeronave" },
  "fleet.kpi.flights": { en: "Total flights", es: "Total de vuelos" },
  "fleet.kpi.best": { en: "Best load factor", es: "Mejor factor de ocupación" },
  "fleet.kpi.worst": { en: "Worst load factor", es: "Peor factor de ocupación" },
  "fleet.loadFactor": { en: "Load Factor by Aircraft", es: "Factor de ocupación por aeronave" },
  "fleet.loadFactor.sub": { en: "Passengers boarded / seats available", es: "Pasajeros abordados / asientos disponibles" },
  "fleet.turnaround": { en: "Average Turnaround Time", es: "Tiempo promedio de rotación" },
  "fleet.overview": { en: "Fleet Overview", es: "Panorama de la flota" },
  "fleet.seats": { en: "Seat Configuration", es: "Configuración de asientos" },

  // Internals page
  "internals.title": { en: "POSTGRESQL INTERNALS", es: "INTERNOS DE POSTGRESQL" },
  "internals.desc": {
    en: "Deep dive into query optimization, indexing strategies, and database internals. All measurements from EXPLAIN ANALYZE on the 5.74M row airline dataset.",
    es: "Análisis a fondo de optimización de consultas, estrategias de indexación e internos de la base de datos. Todas las mediciones provienen de EXPLAIN ANALYZE sobre el dataset de 5.74M registros de aerolíneas.",
  },
  "internals.summary": {
    en: "A revenue lookup that took 381ms now returns in 0.13ms. That is a 3,024x improvement from a single composite index. The dashboard query that joins flights, airports, and aggregates delay rates dropped from 147ms to 0.14ms using a materialized view with targeted indexes. Below you can trace each optimization: what the query planner chose before, what it chooses after, and how much storage each index costs. Twenty indexes consume 300+ MB across the database, but two of them (boarding_passes_pkey at 73 MB) have never been used.",
    es: "Una consulta de ingresos que tardaba 381ms ahora responde en 0.13ms. Eso es una mejora de 3,024x con un solo índice compuesto. La consulta del dashboard que une vuelos, aeropuertos y agrega tasas de retraso bajó de 147ms a 0.14ms usando una vista materializada con índices dirigidos. Más abajo se puede rastrear cada optimización: qué eligió el planificador de consultas antes, qué elige después, y cuánto almacenamiento cuesta cada índice. Veinte índices consumen más de 300 MB en la base de datos, pero dos de ellos (boarding_passes_pkey con 73 MB) jamás se han utilizado.",
  },
  "internals.kpi.speedup": { en: "Best speedup (mat view)", es: "Mayor aceleración (vista mat.)" },
  "internals.kpi.indexes": { en: "Active indexes", es: "Índices activos" },
  "internals.kpi.queries": { en: "Queries optimized", es: "Consultas optimizadas" },
  "internals.kpi.fastest": { en: "Fastest query (ms)", es: "Consulta más rápida (ms)" },
  "internals.perf": { en: "Query Performance: Before vs After", es: "Rendimiento: antes vs después" },
  "internals.perf.sub": { en: "Measured with EXPLAIN ANALYZE", es: "Medido con EXPLAIN ANALYZE" },
  "internals.indexSize": { en: "Index Size Analysis", es: "Análisis de tamaño de índices" },
  "internals.indexSize.sub": { en: "Sorted by size, with usage statistics", es: "Ordenados por tamaño, con estadísticas de uso" },
  "internals.topics": { en: "PostgreSQL Topics Covered", es: "Temas de PostgreSQL cubiertos" },

  // Pipeline page
  "pipeline.title": { en: "ETL PIPELINE + PG vs BQ", es: "PIPELINE ETL + PG vs BQ" },
  "pipeline.summary": {
    en: "The same 5.74M rows live in two systems now. A Python pipeline using server-side cursors extracted everything from PostgreSQL at 56K rows/second, flattened JSONB columns and point geometries, then loaded it all into BigQuery in 102 seconds. Running the same five analytical queries on both systems reveals a split personality: PostgreSQL with indexes returns a single flight's revenue in 2.6ms, while BigQuery needs 800ms just to spin up the job. But flip to a full-table revenue scan and BigQuery's columnar engine finishes before PostgreSQL is halfway through its sequential read.",
    es: "Los mismos 5.74M registros ahora viven en dos sistemas. Un pipeline en Python con cursores del lado del servidor extrajo todo desde PostgreSQL a 56K registros por segundo, aplanó las columnas JSONB y las geometrías de punto, y después cargó todo en BigQuery en 102 segundos. Al correr las mismas cinco consultas analíticas en ambos sistemas se revela una doble personalidad: PostgreSQL con índices devuelve el ingreso de un solo vuelo en 2.6ms, mientras que BigQuery necesita 800ms nada más para levantar el job. Pero si pasas a un escaneo completo de ingresos, el motor columnar de BigQuery termina antes de que PostgreSQL llegue a la mitad de su lectura secuencial.",
  },
  "pipeline.kpi.rows": { en: "Rows migrated", es: "Registros migrados" },
  "pipeline.kpi.tables": { en: "Tables", es: "Tablas" },
  "pipeline.kpi.duration": { en: "Duration (seconds)", es: "Duración (segundos)" },
  "pipeline.kpi.throughput": { en: "Throughput (rows/s)", es: "Rendimiento (reg/s)" },
  "pipeline.arch": { en: "Pipeline Architecture", es: "Arquitectura del pipeline" },
  "pipeline.perf": { en: "Performance: PostgreSQL vs BigQuery", es: "Rendimiento: PostgreSQL vs BigQuery" },
  "pipeline.perf.sub": { en: "Same queries, same dataset. PG: Docker (1 CPU, 512MB). BQ: on-demand US region.", es: "Mismas consultas, mismo dataset. PG: Docker (1 CPU, 512MB). BQ: bajo demanda, región US." },
  "pipeline.pgWins": { en: "PG WINS: POINT LOOKUPS", es: "PG GANA: CONSULTAS PUNTUALES" },
  "pipeline.pgWins.desc": { en: "With proper indexes, single-row lookups take 2.6ms. BigQuery minimum is ~500ms due to job scheduling overhead, 200x slower for this pattern.", es: "Con los índices correctos, las consultas de un solo registro tardan 2.6ms. El mínimo de BigQuery es ~500ms por el overhead de programación de jobs: 200x más lento para este patrón." },
  "pipeline.bqWins": { en: "BQ WINS: FULL SCANS AT SCALE", es: "BQ GANA: ESCANEOS A ESCALA" },
  "pipeline.bqWins.desc": { en: "For analytical queries scanning millions of rows, BigQuery columnar storage and massive parallelism keep times flat. PG times grow linearly with data.", es: "Para consultas analíticas que barren millones de registros, el almacenamiento columnar y el paralelismo masivo de BigQuery mantienen los tiempos constantes. En PostgreSQL, los tiempos crecen de forma lineal con el volumen de datos." },
  "pipeline.syntax": { en: "SQL Syntax: PG vs BQ", es: "Sintaxis SQL: PG vs BQ" },
  "pipeline.archComp": { en: "Architecture Comparison", es: "Comparación de arquitectura" },

  // Common
  "common.low": { en: "Low", es: "Bajo" },
  "common.medium": { en: "Medium", es: "Medio" },
  "common.high": { en: "High", es: "Alto" },
  "common.from": { en: "From", es: "Origen" },
  "common.to": { en: "To", es: "Destino" },
  "common.flights": { en: "Flights", es: "Vuelos" },
  "common.delayed": { en: "Delayed", es: "Retrasados" },
  "common.delayPct": { en: "Delay %", es: "% Retraso" },
  "common.avgDelay": { en: "Avg Delay", es: "Retraso prom." },
  "common.pax": { en: "Pax", es: "Pasajeros" },
  "common.avgTicket": { en: "Avg Ticket", es: "Boleto prom." },
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const toggle = () => setLang((l) => (l === "en" ? "es" : "en"));
  const t = (key: string) => translations[key]?.[lang] ?? key;

  return <I18nCtx.Provider value={{ lang, toggle, t }}>{children}</I18nCtx.Provider>;
}
