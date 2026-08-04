"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

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
  "nav.internals": { en: "PERFORMANCE", es: "RENDIMIENTO" },
  "nav.pipeline": { en: "PIPELINE", es: "PIPELINE" },
  "nav.switchLang": { en: "Ver en español", es: "Switch to English" },

  // Overview page
  "overview.title": { en: "FLIGHT//DB", es: "FLIGHT//DB" },
  "overview.desc": {
    en: "Interactive analytics across 104 airports and 532 routes: delay patterns, revenue concentration, fleet utilization and the network geography underneath them.",
    es: "Analítica interactiva sobre 104 aeropuertos y 532 rutas: patrones de retraso, concentración de ingresos, utilización de flota y la geografía de red que hay debajo.",
  },
  "overview.kpi.rows": { en: "Records analyzed", es: "Registros analizados" },
  "overview.kpi.rows.sub": { en: "bookings, tickets, flights and boarding passes", es: "reservas, boletos, vuelos y pases de abordar" },
  "overview.kpi.airports": { en: "Airports", es: "Aeropuertos" },
  "overview.kpi.airports.sub": { en: "spanning 11 time zones", es: "a lo largo de 11 husos horarios" },
  "overview.kpi.revenue": { en: "Total revenue (RUB)", es: "Ingresos totales (RUB)" },
  "overview.kpi.revenue.sub": { en: "across 451 revenue-generating routes", es: "en 451 rutas con ingresos" },
  "overview.kpi.delay": { en: "Avg delay rate", es: "Tasa promedio de retraso" },
  "overview.kpi.delay.sub": { en: "flights departing >15 min late", es: "vuelos que salen >15 min tarde" },
  "overview.kpi.speedup": { en: "Mat view speedup", es: "Aceleración vista mat." },
  "overview.kpi.speedup.sub": { en: "same query, materialized view vs raw", es: "misma consulta, vista materializada vs directa" },
  "overview.kpi.etl": { en: "ETL migration (sec)", es: "Migración ETL (seg)" },
  "overview.kpi.etl.sub": { en: "PostgreSQL to BigQuery, end to end", es: "de PostgreSQL a BigQuery, de punta a punta" },
  "overview.kpi.arrived": { en: "Flights arrived", es: "Vuelos completados" },
  "overview.kpi.arrived.sub": { en: "the basis for every delay figure", es: "la base de cada cifra de retraso" },
  "overview.kpi.routes": { en: "Routes mapped", es: "Rutas mapeadas" },
  "overview.kpi.routes.sub": { en: "between 104 airports", es: "entre 104 aeropuertos" },
  "overview.explore": { en: "EXPLORE THE DATA", es: "EXPLORA LOS DATOS" },
  "overview.explore.sub": {
    en: "Six views, one network. Follow them in order like chapters, or jump straight to what interests you.",
    es: "Seis vistas, una sola red. Síguelas en orden como capítulos, o salta directo a lo que te interese.",
  },
  "overview.card.map": { en: "ROUTE MAP", es: "MAPA DE RUTAS" },
  "overview.card.map.desc": { en: "104 airports, 532 routes on an interactive WebGL map", es: "104 aeropuertos, 532 rutas en un mapa interactivo WebGL" },
  "overview.card.map.q": { en: "Where is the network dense, and where does it hang by a single arc?", es: "¿Dónde es densa la red y dónde pende de un solo arco?" },
  "overview.card.delays": { en: "DELAY ANALYSIS", es: "ANÁLISIS DE RETRASOS" },
  "overview.card.delays.desc": { en: "Heatmaps, worst routes, aircraft and time-of-day patterns", es: "Mapas de calor, peores rutas, patrones por aeronave y hora del día" },
  "overview.card.delays.q": { en: "When do flights run late, and do they ever catch up in the air?", es: "¿Cuándo se retrasan los vuelos y logran recuperar tiempo en el aire?" },
  "overview.card.revenue": { en: "REVENUE", es: "INGRESOS" },
  "overview.card.revenue.desc": { en: "Pareto curves, fare class split, monthly trends", es: "Curvas de Pareto, distribución por clase, tendencias mensuales" },
  "overview.card.revenue.q": { en: "How few routes carry half the money?", es: "¿Qué tan pocas rutas cargan con la mitad del dinero?" },
  "overview.card.fleet": { en: "FLEET", es: "FLOTA" },
  "overview.card.fleet.desc": { en: "Load factors, turnaround times, seat configurations", es: "Factores de ocupación, tiempos de rotación, configuraciones de asientos" },
  "overview.card.fleet.q": { en: "Which aircraft earn their keep, and which fly nearly empty?", es: "¿Qué aeronaves se ganan su lugar y cuáles vuelan casi vacías?" },
  "overview.card.internals": { en: "PERFORMANCE", es: "RENDIMIENTO" },
  "overview.card.internals.desc": { en: "Query plans, index strategy, partitioning, storage reclamation", es: "Planes de consulta, estrategia de índices, particionamiento, recuperación de espacio" },
  "overview.card.internals.q": { en: "How does a 381 ms query become 0.13 ms?", es: "¿Cómo una consulta de 381 ms pasa a 0.13 ms?" },
  "overview.card.pipeline": { en: "DATA PIPELINE", es: "PIPELINE DE DATOS" },
  "overview.card.pipeline.desc": { en: "Warehouse migration + engine performance comparison", es: "Migración al almacén de datos + comparación de rendimiento entre motores" },
  "overview.card.pipeline.q": { en: "When does BigQuery beat PostgreSQL, and when is it 200x slower?", es: "¿Cuándo BigQuery le gana a PostgreSQL y cuándo es 200x más lento?" },

  // Map page
  "map.colorBy": { en: "COLOR BY", es: "COLOREAR POR" },
  "map.show": { en: "SHOW", es: "MOSTRAR" },
  "map.mode.delay": { en: "DELAY RATE", es: "TASA DE RETRASO" },
  "map.mode.flights": { en: "TRAFFIC", es: "TRÁFICO" },
  "map.all": { en: "ALL", es: "TODAS" },
  "map.clear": { en: "CLEAR", es: "QUITAR" },
  "map.airports": { en: "airports", es: "aeropuertos" },
  "map.routesLabel": { en: "routes", es: "rutas" },
  "map.topHubs": { en: "TOP HUBS", es: "HUBS PRINCIPALES" },
  "map.longestRoutes": { en: "LONGEST ROUTES", es: "RUTAS MÁS LARGAS" },
  "map.legend": { en: "LEGEND", es: "LEYENDA" },
  "map.about": { en: "ABOUT THIS MAP", es: "SOBRE ESTE MAPA" },
  "map.hint": {
    en: "Click any airport to isolate its routes. Click it again to release.",
    es: "Haz clic en un aeropuerto para aislar sus rutas. Haz clic de nuevo para soltarlo.",
  },
  "map.destinations": { en: "dest", es: "dest" },
  "map.legend.l1": { en: "< 3% delayed", es: "< 3% retrasados" },
  "map.legend.l2": { en: "3–5% delayed", es: "3–5% retrasados" },
  "map.legend.l3": { en: "5–7% delayed", es: "5–7% retrasados" },
  "map.legend.l4": { en: "> 7% delayed", es: "> 7% retrasados" },
  "map.legend.width": { en: "Arc width = flights on the route", es: "Grosor del arco = vuelos en la ruta" },
  "map.webglTitle": { en: "MAP REQUIRES WEBGL", es: "EL MAPA REQUIERE WEBGL" },
  "map.webglBody": {
    en: "Your browser does not fully support WebGL2. Try Chrome or Firefox with hardware acceleration enabled.",
    es: "Tu navegador no soporta WebGL2 por completo. Prueba Chrome o Firefox con aceleración por hardware activada.",
  },
  "map.loading": { en: "LOADING MAP...", es: "CARGANDO MAPA..." },
  "map.summary": {
    en: "Russia spans 11 time zones and 104 commercial airports. Three Moscow hubs (DME, SVO, VKO) anchor the entire network, with 131 destinations between them. As you move east, connectivity thins dramatically: Anadyr and Magadan hang by a single arc each. The color gradient tells the delay story at a glance: green corridors run smoothly, red arcs signal chronic operational strain.",
    es: "Rusia se extiende por 11 husos horarios y 104 aeropuertos comerciales. Tres hubs de Moscú (DME, SVO, VKO) sostienen toda la red, con 131 destinos entre los tres. Conforme te mueves hacia el este, la conectividad se adelgaza de golpe: Anádyr y Magadán cuelgan de un solo arco cada uno. El gradiente de color cuenta la historia de los retrasos de un vistazo: los corredores verdes fluyen sin problema, los arcos rojos señalan tensión operativa crónica.",
  },

  // Delays page
  "delays.title": { en: "DELAY ANALYSIS", es: "ANÁLISIS DE RETRASOS" },
  "delays.summary": {
    en: "Out of 49,235 completed flights, 2,394 departed more than 15 minutes late. None of them recovered the lost time in the air. Sundays, Fridays and Wednesdays run the highest daily rates, and the hottest single windows are the 18:00-20:00 evening departures at 7.2%. The Airbus A321-200 leads delay frequency at 5.9%, nearly double the A319-100. The pattern is clear: congestion at high-traffic hours plus tight turnaround scheduling leaves zero margin for recovery.",
    es: "De los 49,235 vuelos completados, 2,394 salieron con más de 15 minutos de retraso. Ninguno recuperó el tiempo perdido en el aire. Los domingos, viernes y miércoles registran las tasas diarias más altas, y las ventanas más críticas son las salidas de 18:00 a 20:00, con 7.2%. El Airbus A321-200 encabeza la frecuencia de demoras con 5.9%, casi el doble que el A319-100. El patrón es claro: congestión en horarios de alto tráfico más una programación de rotación muy ajustada no dejan ningún margen para recuperarse.",
  },
  "delays.kpi.overall": { en: "Overall delay rate", es: "Tasa general de retraso" },
  "delays.kpi.overall.sub": { en: "of 49,235 completed flights", es: "de 49,235 vuelos completados" },
  "delays.kpi.total": { en: "Delayed flights", es: "Vuelos retrasados" },
  "delays.kpi.total.sub": { en: "departed more than 15 min late", es: "salieron con más de 15 min de retraso" },
  "delays.kpi.worst": { en: "Worst route delay %", es: "Peor % de retraso en ruta" },
  "delays.kpi.recovery": { en: "Delay recovery rate", es: "Tasa de recuperación" },
  "delays.kpi.recovery.sub": { en: "no delayed flight made up time in the air", es: "ningún vuelo retrasado recuperó tiempo en el aire" },
  "delays.heatmap": { en: "Delay Heatmap", es: "Mapa de calor de retrasos" },
  "delays.heatmap.sub": { en: "Percentage of flights delayed >15 min by hour and day of week", es: "Porcentaje de vuelos con retraso >15 min por hora y día de la semana" },
  "delays.heatmap.take": {
    en: "The brightest cells are evening departures: Wednesday and Sunday at 18:00-20:00 peak at 7.2%, and no window of the week drops much below 3% — the network never fully relaxes.",
    es: "Las celdas más brillantes son salidas vespertinas: los miércoles y domingos de 18:00 a 20:00 llegan al 7.2%, y ninguna ventana de la semana baja mucho del 3%: la red nunca se relaja del todo.",
  },
  "delays.byAircraft": { en: "Delay Rate by Aircraft Type", es: "Tasa de retraso por tipo de aeronave" },
  "delays.byAircraft.take": {
    en: "The A321-200 runs late on 5.9% of departures, the A319-100 on 3.9% — the narrow-body workhorses sit at both ends of the ranking.",
    es: "El A321-200 sale tarde en el 5.9% de sus vuelos y el A319-100 en el 3.9%: los aviones de fuselaje estrecho ocupan ambos extremos de la tabla.",
  },
  "delays.byDistance": { en: "Delay Rate by Distance", es: "Tasa de retraso por distancia" },
  "delays.byDistance.take": {
    en: "From short hops to 5,600 km crossings the rate barely moves (4.3–5.1%): congestion drives lateness, not route length.",
    es: "De saltos cortos a travesías de 5,600 km la tasa apenas se mueve (4.3–5.1%): la congestión causa los retrasos, no la longitud de la ruta.",
  },
  "delays.topRoutes": { en: "Top 20 Most Delayed Routes", es: "Las 20 rutas con más retrasos" },
  "delays.topRoutes.sub": { en: "Routes with >50 flights", es: "Rutas con más de 50 vuelos" },
  "delays.topRoutes.take": {
    en: "Voronezh–St. Petersburg tops the list: 1 in 9 flights late, and when they are late it averages more than three hours.",
    es: "Vorónezh–San Petersburgo encabeza la lista: 1 de cada 9 vuelos sale tarde, y cuando pasa, el retraso promedio supera las tres horas.",
  },

  // Revenue page
  "revenue.title": { en: "REVENUE ANALYSIS", es: "ANÁLISIS DE INGRESOS" },
  "revenue.summary": {
    en: "37.7 billion rubles flow through 451 routes, but the distribution is radically uneven. Just 38 routes generate half of all revenue. The Moscow-Khabarovsk corridor alone pulls in 1.4B RUB, with an average ticket price of 78,280 RUB. Meanwhile, Business class passengers represent only 10% of tickets but capture 26.5% of total revenue. The Pareto curve below bends sharply: by route 128, you have already accounted for 80% of income.",
    es: "37.7 mil millones de rublos fluyen a través de 451 rutas, pero la distribución es radicalmente desigual. Apenas 38 rutas generan la mitad de todos los ingresos. Solo el corredor Moscú-Jabárovsk recauda 1.4B RUB, con un precio promedio por boleto de 78,280 RUB. Por otro lado, los pasajeros de clase Business representan apenas el 10% de los boletos, pero capturan el 26.5% del ingreso total. La curva de Pareto de abajo se dobla con fuerza: para la ruta número 128, ya se ha contabilizado el 80% del ingreso.",
  },
  "revenue.kpi.total": { en: "Total revenue (RUB)", es: "Ingresos totales (RUB)" },
  "revenue.kpi.total.sub": { en: "across 451 routes", es: "en 451 rutas" },
  "revenue.kpi.avg": { en: "Avg ticket price", es: "Precio promedio del boleto" },
  "revenue.kpi.avg.sub": { en: "weighted across all fare classes", es: "ponderado entre todas las clases" },
  "revenue.kpi.pareto80": { en: "Routes for 80% revenue", es: "Rutas para el 80% del ingreso" },
  "revenue.kpi.pareto80.sub": { en: "the other 323 routes share the rest", es: "las otras 323 rutas se reparten el resto" },
  "revenue.kpi.totalRoutes": { en: "Total routes", es: "Total de rutas" },
  "revenue.kpi.totalRoutes.sub": { en: "with ticket revenue in the window", es: "con ingresos por boletos en la ventana" },
  "revenue.pareto": { en: "Revenue Pareto Curve", es: "Curva de Pareto de ingresos" },
  "revenue.pareto.sub": { en: "Cumulative revenue % by route rank", es: "% acumulado de ingresos por posición de ruta" },
  "revenue.pareto.take": {
    en: "The curve bends hard and early: 38 routes reach 50% of all revenue, 128 reach 80%. The long tail barely lifts the line.",
    es: "La curva se dobla fuerte y temprano: 38 rutas alcanzan el 50% de todos los ingresos y 128 llegan al 80%. La larga cola apenas levanta la línea.",
  },
  "revenue.axis.rank": { en: "route rank", es: "posición de ruta" },
  "revenue.axis.cumul": { en: "cumulative % of revenue", es: "% acumulado de ingresos" },
  "revenue.routesWord": { en: "routes", es: "rutas" },
  "revenue.fareClass": { en: "Revenue by Fare Class", es: "Ingresos por clase tarifaria" },
  "revenue.fareClass.take": {
    en: "Business is 10% of tickets but 26.5% of revenue, at 3.2x the Economy fare. Comfort barely registers.",
    es: "Business es el 10% de los boletos pero el 26.5% de los ingresos, con una tarifa 3.2x la de Económica. Confort apenas figura.",
  },
  "revenue.ofRevenue": { en: "of revenue", es: "del ingreso" },
  "revenue.ofTickets": { en: "of tickets", es: "de los boletos" },
  "revenue.avgShort": { en: "avg", es: "prom." },
  "revenue.monthly": { en: "Monthly Revenue Trend", es: "Tendencia mensual de ingresos" },
  "revenue.monthly.take": {
    en: "June and July are the only complete months in the window; May and August are partial, which is what the steep edges show.",
    es: "Junio y julio son los únicos meses completos en la ventana; mayo y agosto son parciales, y eso es lo que muestran los bordes abruptos.",
  },
  "revenue.topRoutes": { en: "Top 20 Routes by Revenue", es: "Las 20 rutas con más ingresos" },
  "revenue.topRoutes.take": {
    en: "Moscow Domodedovo–Khabarovsk alone books 1.4B RUB from 90 flights: long-haul distance at a 78K RUB average ticket.",
    es: "Solo Moscú Domodédovo–Jabárovsk registra 1.4B RUB en 90 vuelos: distancia de largo alcance con boleto promedio de 78K RUB.",
  },

  // Fleet page
  "fleet.title": { en: "FLEET & UTILIZATION", es: "FLOTA Y UTILIZACIÓN" },
  "fleet.summary": {
    en: "Eight aircraft types serve this network, and they live very different lives. The Boeing 777-300 fills 72.8% of its 402 seats on average, the workhorse of long-haul profitability. At the other extreme, the Cessna 208 Caravan flies 13,789 routes but carries fewer than 2 passengers per flight on average, a 16% load factor that only makes sense as a connectivity lifeline to remote airports. Turnaround tells another story: the A319-100 averages just 13 minutes on the ground, while the 777 needs nearly 6 hours between flights.",
    es: "Ocho tipos de aeronave operan en esta red, y cada uno vive una realidad muy distinta. El Boeing 777-300 llena en promedio el 72.8% de sus 402 asientos: es el motor de la rentabilidad en rutas de largo alcance. En el otro extremo, el Cessna 208 Caravan vuela 13,789 rutas pero lleva menos de 2 pasajeros por vuelo en promedio, un factor de ocupación del 16% que solo tiene sentido como línea de vida hacia aeropuertos remotos. Los tiempos de rotación cuentan otra historia: el A319-100 promedia apenas 13 minutos en tierra, mientras que el 777 necesita casi 6 horas entre vuelos.",
  },
  "fleet.kpi.types": { en: "Aircraft types", es: "Tipos de aeronave" },
  "fleet.kpi.types.sub": { en: "from the 402-seat 777 to the 12-seat Cessna", es: "del 777 de 402 asientos al Cessna de 12" },
  "fleet.kpi.flights": { en: "Total flights", es: "Total de vuelos" },
  "fleet.kpi.flights.sub": { en: "flown by the fleet in the window", es: "volados por la flota en la ventana" },
  "fleet.kpi.best": { en: "Best load factor", es: "Mejor factor de ocupación" },
  "fleet.kpi.worst": { en: "Worst load factor", es: "Peor factor de ocupación" },
  "fleet.loadFactor": { en: "Load Factor by Aircraft", es: "Factor de ocupación por aeronave" },
  "fleet.loadFactor.sub": { en: "Passengers boarded / seats available", es: "Pasajeros abordados / asientos disponibles" },
  "fleet.loadFactor.take": {
    en: "The 777-300 fills 72.8% of its seats; the Cessna Caravan flies at 16% — a connectivity lifeline, not a profit center.",
    es: "El 777-300 llena el 72.8% de sus asientos; el Cessna Caravan vuela al 16%: una línea de vida para la conectividad, no un centro de ganancias.",
  },
  "fleet.turnaround": { en: "Average Turnaround Time", es: "Tiempo promedio de rotación" },
  "fleet.overview": { en: "Fleet Overview", es: "Panorama de la flota" },
  "fleet.overview.take": {
    en: "Range and duty are matched: the long-range Boeings fly few, long sectors while the Cessna racks up thousands of short hops.",
    es: "Alcance y uso van de la mano: los Boeing de largo alcance vuelan pocos tramos largos mientras el Cessna acumula miles de saltos cortos.",
  },
  "fleet.seats": { en: "Seat Configuration", es: "Configuración de asientos" },
  "fleet.seats.take": {
    en: "Only the wide-bodies carry a real Business cabin; below 200 seats the aircraft are one- or two-class.",
    es: "Solo los de fuselaje ancho llevan una cabina Business real; por debajo de 200 asientos las aeronaves son de una o dos clases.",
  },
  "fleet.col.aircraft": { en: "Aircraft", es: "Aeronave" },
  "fleet.col.range": { en: "Range (km)", es: "Alcance (km)" },
  "fleet.col.hours": { en: "Flight hours", es: "Horas de vuelo" },
  "fleet.col.duration": { en: "Avg duration", es: "Duración prom." },
  "fleet.col.economy": { en: "Economy", es: "Económica" },
  "fleet.col.comfort": { en: "Comfort", es: "Confort" },
  "fleet.col.business": { en: "Business", es: "Business" },
  "fleet.col.total": { en: "Total", es: "Total" },

  // Internals page
  "internals.title": { en: "QUERY PERFORMANCE", es: "RENDIMIENTO DE CONSULTAS" },
  "internals.desc": {
    en: "Query optimization, indexing strategy and storage behaviour behind the dashboard. Every measurement is taken with EXPLAIN ANALYZE against the live dataset.",
    es: "Optimización de consultas, estrategia de indexación y comportamiento del almacenamiento detrás del dashboard. Cada medición se toma con EXPLAIN ANALYZE sobre el dataset en vivo.",
  },
  "internals.summary": {
    en: "A revenue lookup that took 381ms now returns in 0.13ms. That is a 3,024x improvement from a single composite index. The dashboard query that joins flights, airports, and aggregates delay rates dropped from 147ms to 0.14ms using a materialized view with targeted indexes. Below you can trace each optimization: what the query planner chose before, what it chooses after, and how much storage each index costs. Twenty indexes consume 300+ MB across the database, but two of them (boarding_passes_pkey at 73 MB) have never been used.",
    es: "Una consulta de ingresos que tardaba 381ms ahora responde en 0.13ms. Eso es una mejora de 3,024x con un solo índice compuesto. La consulta del dashboard que une vuelos, aeropuertos y agrega tasas de retraso bajó de 147ms a 0.14ms usando una vista materializada con índices dirigidos. Más abajo se puede rastrear cada optimización: qué eligió el planificador de consultas antes, qué elige después, y cuánto almacenamiento cuesta cada índice. Veinte índices consumen más de 300 MB en la base de datos, pero dos de ellos (boarding_passes_pkey con 73 MB) jamás se han utilizado.",
  },
  "internals.kpi.speedup": { en: "Best speedup (mat view)", es: "Mayor aceleración (vista mat.)" },
  "internals.kpi.speedup.sub": { en: "dashboard query, 147ms to 0.14ms", es: "consulta del dashboard, de 147ms a 0.14ms" },
  "internals.kpi.indexes": { en: "Active indexes", es: "Índices activos" },
  "internals.kpi.indexes.sub": { en: "300+ MB of B-tree and GIN storage", es: "más de 300 MB en B-tree y GIN" },
  "internals.kpi.queries": { en: "Queries optimized", es: "Consultas optimizadas" },
  "internals.kpi.queries.sub": { en: "each measured with EXPLAIN ANALYZE", es: "cada una medida con EXPLAIN ANALYZE" },
  "internals.kpi.fastest": { en: "Fastest query (ms)", es: "Consulta más rápida (ms)" },
  "internals.kpi.fastest.sub": { en: "materialized view read", es: "lectura de la vista materializada" },
  "internals.perf": { en: "Query Performance: Before vs After", es: "Rendimiento: antes vs después" },
  "internals.perf.sub": { en: "Measured with EXPLAIN ANALYZE", es: "Medido con EXPLAIN ANALYZE" },
  "internals.perf.take": {
    en: "Not every attempt pays off, and that is part of the story: route delay analysis barely moved (1x) because its bottleneck is the aggregation, not the lookup.",
    es: "No todo intento rinde, y eso es parte de la historia: el análisis de retrasos por ruta casi no mejoró (1x) porque su cuello de botella es la agregación, no la búsqueda.",
  },
  "internals.indexSize": { en: "Index Size Analysis", es: "Análisis de tamaño de índices" },
  "internals.indexSize.sub": { en: "Sorted by size, with usage statistics", es: "Ordenados por tamaño, con estadísticas de uso" },
  "internals.indexSize.take": {
    en: "Zero in the Scans column means storage with no payback: boarding_passes_pkey alone holds 73 MB that no query has ever read.",
    es: "Un cero en la columna de escaneos es almacenamiento sin retorno: tan solo boarding_passes_pkey ocupa 73 MB que ninguna consulta ha leído.",
  },
  "internals.indexSize.caption": {
    en: "Scans = times the planner chose the index since statistics were reset.",
    es: "Escaneos = veces que el planificador eligió el índice desde el último reinicio de estadísticas.",
  },
  "internals.col.index": { en: "Index", es: "Índice" },
  "internals.col.size": { en: "Size", es: "Tamaño" },
  "internals.col.scans": { en: "Scans", es: "Escaneos" },
  "internals.col.tuples": { en: "Tuples read", es: "Tuplas leídas" },
  "internals.topics": { en: "Optimization Areas", es: "Áreas de optimización" },
  "internals.topic1.title": { en: "Query Plan Analysis", es: "Análisis de planes de consulta" },
  "internals.topic1.desc": {
    en: "Seq Scan, Index Scan, Index-Only Scan, Bitmap Scan. Hash Join, Nested Loop, Merge Join. Cost model and actual vs estimated rows.",
    es: "Seq Scan, Index Scan, Index-Only Scan, Bitmap Scan. Hash Join, Nested Loop, Merge Join. Modelo de costos y filas reales vs estimadas.",
  },
  "internals.topic2.title": { en: "Index Strategies", es: "Estrategias de índices" },
  "internals.topic2.desc": {
    en: "Composite B-tree, partial indexes, expression indexes, GIN for JSONB, covering indexes with INCLUDE. 4,780x speedup on JSONB search.",
    es: "B-tree compuestos, índices parciales, índices de expresión, GIN para JSONB, índices cobertores con INCLUDE. Aceleración de 4,780x en búsqueda JSONB.",
  },
  "internals.topic3.title": { en: "Table Partitioning", es: "Particionamiento de tablas" },
  "internals.topic3.desc": {
    en: "Range partitioning by month. Partition pruning eliminates 80% of scans. Trade-off: point lookups 5x slower.",
    es: "Particionamiento por rango mensual. La poda de particiones elimina el 80% de los escaneos. Contraparte: consultas puntuales 5x más lentas.",
  },
  "internals.topic4.title": { en: "Statistics & Monitoring", es: "Estadísticas y monitoreo" },
  "internals.topic4.desc": {
    en: "pg_stat_user_tables, pg_stat_user_indexes, cache hit ratios. 93-100% cache hit across tables.",
    es: "pg_stat_user_tables, pg_stat_user_indexes, tasas de acierto de caché. 93-100% de acierto entre tablas.",
  },
  "internals.topic5.title": { en: "VACUUM Tuning", es: "Ajuste de VACUUM" },
  "internals.topic5.desc": {
    en: "Dead tuple lifecycle, VACUUM vs VACUUM FULL, autovacuum thresholds. XID wraparound prevention.",
    es: "Ciclo de vida de tuplas muertas, VACUUM vs VACUUM FULL, umbrales de autovacuum. Prevención del desborde de XID.",
  },
  "internals.topic6.title": { en: "WAL & Checkpoints", es: "WAL y checkpoints" },
  "internals.topic6.desc": {
    en: "Write-Ahead Log config, checkpoint statistics, synchronous commit trade-offs. Cloud SQL constraints.",
    es: "Configuración del Write-Ahead Log, estadísticas de checkpoints, compromisos de synchronous commit. Restricciones de Cloud SQL.",
  },

  // Pipeline page
  "pipeline.title": { en: "DATA PIPELINE", es: "PIPELINE DE DATOS" },
  "pipeline.summary": {
    en: "The same 5.74M rows live in two systems now. A Python pipeline using server-side cursors extracted everything from PostgreSQL at 56K rows/second, flattened JSONB columns and point geometries, then loaded it all into BigQuery in 102 seconds. Running the same five analytical queries on both systems reveals a split personality: PostgreSQL with indexes returns a single flight's revenue in 2.6ms, while BigQuery needs 800ms just to spin up the job. But flip to a full-table revenue scan and BigQuery's columnar engine finishes before PostgreSQL is halfway through its sequential read.",
    es: "Los mismos 5.74M registros ahora viven en dos sistemas. Un pipeline en Python con cursores del lado del servidor extrajo todo desde PostgreSQL a 56K registros por segundo, aplanó las columnas JSONB y las geometrías de punto, y después cargó todo en BigQuery en 102 segundos. Al correr las mismas cinco consultas analíticas en ambos sistemas se revela una doble personalidad: PostgreSQL con índices devuelve el ingreso de un solo vuelo en 2.6ms, mientras que BigQuery necesita 800ms nada más para levantar el job. Pero si pasas a un escaneo completo de ingresos, el motor columnar de BigQuery termina antes de que PostgreSQL llegue a la mitad de su lectura secuencial.",
  },
  "pipeline.kpi.rows": { en: "Rows migrated", es: "Registros migrados" },
  "pipeline.kpi.rows.sub": { en: "from 8 PostgreSQL tables", es: "desde 8 tablas de PostgreSQL" },
  "pipeline.kpi.tables": { en: "Tables", es: "Tablas" },
  "pipeline.kpi.tables.sub": { en: "bookings through boarding passes", es: "de reservas a pases de abordar" },
  "pipeline.kpi.duration": { en: "Duration (seconds)", es: "Duración (segundos)" },
  "pipeline.kpi.duration.sub": { en: "end-to-end wall clock", es: "tiempo total de punta a punta" },
  "pipeline.kpi.throughput": { en: "Throughput (rows/s)", es: "Rendimiento (reg/s)" },
  "pipeline.kpi.throughput.sub": { en: "server-side cursor, 50K row batches", es: "cursor del lado del servidor, lotes de 50K" },
  "pipeline.arch": { en: "Pipeline Architecture", es: "Arquitectura del pipeline" },
  "pipeline.arch.take": {
    en: "Three stages, one pass: stream out of PostgreSQL, reshape in pandas, bulk-load into BigQuery.",
    es: "Tres etapas, una sola pasada: extraer de PostgreSQL en flujo, transformar en pandas, cargar en bloque a BigQuery.",
  },
  "pipeline.step.extract.detail": {
    en: "Server-side cursor, 50K batch size, ~56K rows/s",
    es: "Cursor del lado del servidor, lotes de 50K, ~56K filas/s",
  },
  "pipeline.step.transform.detail": {
    en: "JSONB flattening, point parsing, UTC normalization",
    es: "Aplanado de JSONB, parseo de puntos, normalización UTC",
  },
  "pipeline.step.load.detail": {
    en: "google-cloud-bigquery SDK, WRITE_TRUNCATE, autodetect",
    es: "SDK google-cloud-bigquery, WRITE_TRUNCATE, autodetección",
  },
  "pipeline.perf": { en: "Performance: PostgreSQL vs BigQuery", es: "Rendimiento: PostgreSQL vs BigQuery" },
  "pipeline.perf.sub": { en: "Same queries, same dataset. PG: Docker (1 CPU, 512MB). BQ: on-demand US region.", es: "Mismas consultas, mismo dataset. PG: Docker (1 CPU, 512MB). BQ: bajo demanda, región US." },
  "pipeline.perf.take": {
    en: "Point lookups: PostgreSQL wins by ~200x. Full scans: BigQuery stays flat as data grows. Neither engine wins both games.",
    es: "Consultas puntuales: PostgreSQL gana por ~200x. Escaneos completos: BigQuery se mantiene estable al crecer los datos. Ningún motor gana ambos juegos.",
  },
  "pipeline.pgWins": { en: "PG WINS: POINT LOOKUPS", es: "PG GANA: CONSULTAS PUNTUALES" },
  "pipeline.pgWins.desc": { en: "With proper indexes, single-row lookups take 2.6ms. BigQuery minimum is ~500ms due to job scheduling overhead, 200x slower for this pattern.", es: "Con los índices correctos, las consultas de un solo registro tardan 2.6ms. El mínimo de BigQuery es ~500ms por el overhead de programación de jobs: 200x más lento para este patrón." },
  "pipeline.bqWins": { en: "BQ WINS: FULL SCANS AT SCALE", es: "BQ GANA: ESCANEOS A ESCALA" },
  "pipeline.bqWins.desc": { en: "For analytical queries scanning millions of rows, BigQuery columnar storage and massive parallelism keep times flat. PG times grow linearly with data.", es: "Para consultas analíticas que barren millones de registros, el almacenamiento columnar y el paralelismo masivo de BigQuery mantienen los tiempos constantes. En PostgreSQL, los tiempos crecen de forma lineal con el volumen de datos." },
  "pipeline.syntax": { en: "SQL Syntax: PG vs BQ", es: "Sintaxis SQL: PG vs BQ" },
  "pipeline.syntax.take": {
    en: "The dialects differ mechanically, not conceptually: same SQL, different spellings for types, dates and JSON access.",
    es: "Los dialectos difieren en lo mecánico, no en lo conceptual: el mismo SQL con distinta ortografía para tipos, fechas y acceso a JSON.",
  },
  "pipeline.archComp": { en: "Architecture Comparison", es: "Comparación de arquitectura" },
  "pipeline.col.query": { en: "Query", es: "Consulta" },
  "pipeline.col.concept": { en: "Concept", es: "Concepto" },
  "pipeline.col.dimension": { en: "Dimension", es: "Dimensión" },
  "pipeline.col.pgRaw": { en: "PG (raw)", es: "PG (sin índice)" },
  "pipeline.col.pgIdx": { en: "PG (indexed)", es: "PG (con índice)" },
  "pipeline.col.bqScanned": { en: "BQ scanned", es: "BQ escaneado" },

  // Shared components
  "table.sortHint": { en: "Click a column header to sort", es: "Haz clic en un encabezado para ordenar" },
  "table.showing": { en: "Showing", es: "Mostrando" },
  "day.mon": { en: "MON", es: "LUN" },
  "day.tue": { en: "TUE", es: "MAR" },
  "day.wed": { en: "WED", es: "MIÉ" },
  "day.thu": { en: "THU", es: "JUE" },
  "day.fri": { en: "FRI", es: "VIE" },
  "day.sat": { en: "SAT", es: "SÁB" },
  "day.sun": { en: "SUN", es: "DOM" },
  "heatmap.legendLabel": { en: "share of flights delayed >15 min", es: "% de vuelos con retraso >15 min" },
  "heatmap.peak": { en: "Peak", es: "Pico" },
  "heatmap.delayed": { en: "delayed", es: "retrasados" },
  "heatmap.flights": { en: "flights", es: "vuelos" },
  "speedup.before": { en: "BEFORE", es: "ANTES" },
  "speedup.after": { en: "AFTER", es: "DESPUÉS" },
  "speedup.note": {
    en: "Both bars share one linear scale. Some optimized times are so small the bar sits at minimum width — read the numbers.",
    es: "Ambas barras comparten una escala lineal. Algunos tiempos optimizados son tan pequeños que la barra queda en su ancho mínimo: lee los números.",
  },

  // Page-to-page navigation
  "pagenav.prev": { en: "BACK", es: "ATRÁS" },
  "pagenav.next": { en: "NEXT", es: "SIGUIENTE" },

  // Footer
  "footer.tagline": {
    en: "Route, delay and revenue intelligence for a 104-airport network — computed in PostgreSQL, mirrored to BigQuery, served as a static export.",
    es: "Inteligencia de rutas, retrasos e ingresos para una red de 104 aeropuertos: calculada en PostgreSQL, replicada a BigQuery y servida como exportación estática.",
  },
  "footer.explore": { en: "EXPLORE", es: "EXPLORAR" },
  "footer.engine": { en: "UNDER THE HOOD", es: "BAJO EL CAPÓ" },
  "footer.top": { en: "BACK TO TOP", es: "VOLVER ARRIBA" },

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
  "common.revenue": { en: "Revenue", es: "Ingresos" },
};

const LANG_KEY = "flightdb-lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  // Restore the saved choice after hydration (the export is prerendered in EN)
  useEffect(() => {
    const saved = window.localStorage.getItem(LANG_KEY);
    if (saved === "es" || saved === "en") setLang(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const toggle = () =>
    setLang((l) => {
      const next = l === "en" ? "es" : "en";
      window.localStorage.setItem(LANG_KEY, next);
      return next;
    });

  const t = (key: string) => translations[key]?.[lang] ?? key;

  return <I18nCtx.Provider value={{ lang, toggle, t }}>{children}</I18nCtx.Provider>;
}
