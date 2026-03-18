#!/usr/bin/env python3
"""Generate the flight_analytics.ipynb notebook programmatically."""
import nbformat as nbf

nb = nbf.v4.new_notebook()
nb.metadata.kernelspec = {
    "display_name": "Python 3",
    "language": "python",
    "name": "python3",
}

cells = []

# ── Title ──
cells.append(nbf.v4.new_markdown_cell(
    "# Russian Airlines Flight Analytics -- Visual Dashboard\n\n"
    "Interactive visualizations from 5.74M rows of real airline data across 104 Russian airports.\n\n"
    "**Data source:** [PostgresPro Demo Database](https://postgrespro.com/community/demodb)  \n"
    "**Stack:** PostgreSQL 16 (Docker) | Python | Plotly | Folium"
))

# ── Setup ──
cells.append(nbf.v4.new_code_cell("""import psycopg2
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import folium
from folium.plugins import MarkerCluster
from IPython.display import display, HTML
import warnings
warnings.filterwarnings('ignore')

conn = psycopg2.connect(host='localhost', port=5432, user='app_user',
                        password='dev_secret_123', database='demo')

def query(sql):
    return pd.read_sql(sql, conn)

print("Connected to PostgreSQL. Ready.")
"""))

# ── 1. Delay Heatmap ──
cells.append(nbf.v4.new_markdown_cell(
    "## 1. Delay Heatmap: Hour of Day vs Day of Week\n\n"
    "When do delays cluster? This heatmap shows the percentage of flights delayed "
    "by 15+ minutes, broken down by local departure hour and day of week."
))

cells.append(nbf.v4.new_code_cell("""df_heat = query(\"\"\"
    SELECT
        EXTRACT(ISODOW FROM f.scheduled_departure)::int AS dow,
        EXTRACT(HOUR FROM timezone(dep.timezone, f.scheduled_departure))::int AS hour_local,
        COUNT(*) AS flights,
        ROUND(100.0 * COUNT(*) FILTER (
            WHERE f.actual_departure > f.scheduled_departure + INTERVAL '15 min'
        ) / COUNT(*), 1) AS delay_pct
    FROM bookings.flights f
    JOIN bookings.airports_data dep ON dep.airport_code = f.departure_airport
    WHERE f.status = 'Arrived'
    GROUP BY dow, hour_local
\"\"\")

day_names = {1:'Monday',2:'Tuesday',3:'Wednesday',4:'Thursday',5:'Friday',6:'Saturday',7:'Sunday'}
df_heat['day_name'] = df_heat['dow'].map(day_names)

pivot = df_heat.pivot(index='day_name', columns='hour_local', values='delay_pct')
pivot = pivot.reindex(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'])

fig = px.imshow(pivot, labels=dict(x="Hour (local)", y="Day of Week", color="Delay %"),
                color_continuous_scale=['#2ecc71','#f1c40f','#e74c3c'],
                aspect='auto', title="Flight Delay Rate by Hour and Day of Week")
fig.update_layout(template='plotly_white', width=900, height=400)
fig.show()
"""))

# ── 2. Revenue Pareto ──
cells.append(nbf.v4.new_markdown_cell(
    "## 2. Revenue Pareto Curve\n\n"
    "How concentrated is airline revenue? The Pareto principle suggests 20% of routes "
    "generate 80% of revenue. Let's see if that holds."
))

cells.append(nbf.v4.new_code_cell("""df_pareto = query(\"\"\"
    WITH route_revenue AS (
        SELECT f.departure_airport || '-' || f.arrival_airport AS route,
               SUM(tf.amount) AS revenue
        FROM bookings.ticket_flights tf
        JOIN bookings.flights f ON f.flight_id = tf.flight_id
        WHERE f.status = 'Arrived'
        GROUP BY f.departure_airport, f.arrival_airport
    )
    SELECT route, revenue,
           SUM(revenue) OVER (ORDER BY revenue DESC) / SUM(revenue) OVER () * 100 AS cumul_pct,
           ROW_NUMBER() OVER (ORDER BY revenue DESC) AS rank,
           COUNT(*) OVER () AS total_routes
    FROM route_revenue ORDER BY revenue DESC
\"\"\")

# Find the 80% crossing point
cross_80 = df_pareto[df_pareto['cumul_pct'] >= 80].iloc[0]

fig = go.Figure()
fig.add_trace(go.Scatter(x=df_pareto['rank'], y=df_pareto['cumul_pct'],
                         mode='lines', name='Cumulative Revenue %',
                         line=dict(color='#2c3e50', width=2.5)))
fig.add_hline(y=80, line_dash='dash', line_color='#e74c3c',
              annotation_text='80% of revenue')
fig.add_vline(x=cross_80['rank'], line_dash='dash', line_color='#e74c3c',
              annotation_text=f"{int(cross_80['rank'])} routes ({100*cross_80['rank']/df_pareto['total_routes'].iloc[0]:.0f}%)")
fig.update_layout(title=f"Revenue Pareto: {int(cross_80['rank'])} of {int(df_pareto['total_routes'].iloc[0])} routes generate 80% of revenue",
                  xaxis_title='Route rank (by revenue)', yaxis_title='Cumulative Revenue %',
                  template='plotly_white', width=800, height=400)
fig.show()
"""))

# ── 3. Fare Class Breakdown ──
cells.append(nbf.v4.new_markdown_cell(
    "## 3. Fare Class Revenue and Volume\n\n"
    "Economy dominates ticket volume, but how does Business class compare on revenue contribution?"
))

cells.append(nbf.v4.new_code_cell("""df_fare = query(\"\"\"
    SELECT tf.fare_conditions AS fare_class, COUNT(*) AS tickets,
           SUM(tf.amount)::bigint AS revenue, ROUND(AVG(tf.amount),0)::int AS avg_price
    FROM bookings.ticket_flights tf
    JOIN bookings.flights f ON f.flight_id = tf.flight_id
    WHERE f.status = 'Arrived'
    GROUP BY tf.fare_conditions ORDER BY revenue DESC
\"\"\")

fig = make_subplots(rows=1, cols=2, subplot_titles=('Tickets Sold', 'Revenue (RUB)'))
colors = {'Economy':'#3498db', 'Business':'#e74c3c', 'Comfort':'#2ecc71'}
for _, r in df_fare.iterrows():
    c = colors.get(r['fare_class'], '#95a5a6')
    fig.add_trace(go.Bar(x=[r['fare_class']], y=[r['tickets']], name=r['fare_class'],
                         marker_color=c, showlegend=False), row=1, col=1)
    fig.add_trace(go.Bar(x=[r['fare_class']], y=[r['revenue']], name=r['fare_class'],
                         marker_color=c, showlegend=False), row=1, col=2)
fig.update_layout(template='plotly_white', width=800, height=400,
                  title='Fare Class: Volume vs Revenue')
fig.show()

# Show the numbers
display(df_fare.style.format({'tickets':'{:,.0f}','revenue':'{:,.0f}','avg_price':'{:,.0f}'}))
"""))

# ── 4. Load Factor ──
cells.append(nbf.v4.new_markdown_cell(
    "## 4. Load Factor by Aircraft Type\n\n"
    "Load factor = passengers boarded / seats available. Higher is more efficient."
))

cells.append(nbf.v4.new_code_cell("""df_load = query(\"\"\"
    WITH fc AS (SELECT aircraft_code, COUNT(*) AS seats FROM bookings.seats GROUP BY aircraft_code),
    fp AS (SELECT f.flight_id, f.aircraft_code, COUNT(bp.ticket_no) AS pax
           FROM bookings.flights f LEFT JOIN bookings.boarding_passes bp ON bp.flight_id = f.flight_id
           WHERE f.status='Arrived' GROUP BY f.flight_id, f.aircraft_code)
    SELECT a.model->>'en' AS aircraft, ROUND(100.0*AVG(fp.pax)/MAX(fc.seats),1) AS load_factor,
           COUNT(*) AS flights
    FROM fp JOIN bookings.aircrafts_data a ON a.aircraft_code=fp.aircraft_code
    JOIN fc ON fc.aircraft_code=fp.aircraft_code GROUP BY a.model ORDER BY load_factor
\"\"\")

fig = px.bar(df_load, y='aircraft', x='load_factor', orientation='h',
             color='load_factor', color_continuous_scale=['#e74c3c','#f1c40f','#2ecc71'],
             text='load_factor', title='Average Load Factor by Aircraft Type')
fig.update_traces(texttemplate='%{text}%', textposition='outside')
fig.update_layout(template='plotly_white', width=800, height=400,
                  xaxis_title='Load Factor (%)', yaxis_title='', showlegend=False)
fig.show()
"""))

# ── 5. Performance comparison ──
cells.append(nbf.v4.new_markdown_cell(
    "## 5. Query Performance: Before vs After Optimization\n\n"
    "Measured with `EXPLAIN ANALYZE`. Shows the impact of composite indexes, "
    "partial indexes, and materialized views."
))

cells.append(nbf.v4.new_code_cell("""queries = ["Flights from SVO\\n(point lookup)", "Route delay analysis\\n(aggregation)",
           "Revenue lookup\\n(JOIN 2.3M rows)", "Dashboard query\\n(mat view)"]
before = [33.9, 292, 1283, 174]
after = [2.6, 111, 2.6, 0.13]
speedup = [f"{b/a:.0f}x" for b, a in zip(before, after)]

fig = go.Figure()
fig.add_trace(go.Bar(name='Before (no index)', x=queries, y=before, marker_color='#e74c3c'))
fig.add_trace(go.Bar(name='After (optimized)', x=queries, y=after, marker_color='#2ecc71'))

# Add speedup annotations
for i, s in enumerate(speedup):
    fig.add_annotation(x=queries[i], y=max(before[i], after[i])*1.1,
                       text=s, showarrow=False, font=dict(size=14, color='#2c3e50'))

fig.update_layout(barmode='group', template='plotly_white', width=800, height=400,
                  title='Query Performance: Before vs After Optimization',
                  yaxis_title='Execution Time (ms)', yaxis_type='log')
fig.show()
"""))

# ── 6. Interactive Route Map ──
cells.append(nbf.v4.new_markdown_cell(
    "## 6. Interactive Route Map\n\n"
    "Airport markers sized by traffic volume. Route lines colored by delay rate: "
    "**green** (< 4%), **orange** (4-7%), **red** (> 7%)."
))

cells.append(nbf.v4.new_code_cell("""# Get airports
df_airports = query(\"\"\"
    SELECT airport_code, airport_name->>'en' AS name, city->>'en' AS city,
           coordinates[0] AS lon, coordinates[1] AS lat
    FROM bookings.airports_data
\"\"\")

# Get airport traffic
df_traffic = query(\"\"\"
    SELECT departure_airport AS code, COUNT(*) AS departures
    FROM bookings.flights WHERE status='Arrived'
    GROUP BY departure_airport
\"\"\")
df_airports = df_airports.merge(df_traffic, left_on='airport_code', right_on='code', how='left')
df_airports['departures'] = df_airports['departures'].fillna(0)

# Get top routes
df_routes = query(\"\"\"
    SELECT f.departure_airport AS dep, f.arrival_airport AS arr,
           COUNT(*) AS flights,
           ROUND(100.0 * COUNT(*) FILTER (
               WHERE f.actual_departure > f.scheduled_departure + INTERVAL '15 min'
           ) / COUNT(*), 1) AS delay_pct
    FROM bookings.flights f WHERE f.status='Arrived'
    GROUP BY dep, arr HAVING COUNT(*)>=30 ORDER BY flights DESC LIMIT 150
\"\"\")

# Build map
m = folium.Map(location=[62, 90], zoom_start=3, tiles='CartoDB positron')

# Airport markers
for _, ap in df_airports.iterrows():
    if ap['departures'] > 0:
        radius = max(3, min(15, ap['departures'] / 300))
        folium.CircleMarker(
            location=[ap['lat'], ap['lon']], radius=radius,
            color='#2c3e50', fill=True, fill_opacity=0.7, weight=1,
            popup=f"<b>{ap['name']}</b><br>{ap['city']}<br>{int(ap['departures'])} departures"
        ).add_to(m)

# Route lines
airport_coords = df_airports.set_index('airport_code')[['lat','lon']].to_dict('index')
for _, rt in df_routes.iterrows():
    dep = airport_coords.get(rt['dep'])
    arr = airport_coords.get(rt['arr'])
    if dep and arr:
        color = '#2ecc71' if rt['delay_pct'] < 4 else '#f39c12' if rt['delay_pct'] < 7 else '#e74c3c'
        folium.PolyLine(
            locations=[[dep['lat'], dep['lon']], [arr['lat'], arr['lon']]],
            weight=max(1, min(3, rt['flights'] / 100)), color=color, opacity=0.5,
            popup=f"{rt['dep']}-{rt['arr']}: {rt['flights']} flights, {rt['delay_pct']}% delayed"
        ).add_to(m)

# Save and display
m
"""))

# ── 7. Delay Hotspot Map ──
cells.append(nbf.v4.new_markdown_cell(
    "## 7. Delay Hotspot Map\n\n"
    "Airports colored by delay rate. Larger circles = more traffic."
))

cells.append(nbf.v4.new_code_cell("""df_delay_stats = query(\"\"\"
    SELECT f.departure_airport AS code, COUNT(*) AS flights,
           ROUND(100.0 * COUNT(*) FILTER (
               WHERE f.actual_departure > f.scheduled_departure + INTERVAL '15 min'
           ) / COUNT(*), 1) AS delay_pct
    FROM bookings.flights f
    WHERE f.status='Arrived'
    GROUP BY f.departure_airport
    HAVING COUNT(*)>=30
\"\"\")
df_ap_coords = query(\"\"\"
    SELECT airport_code AS code, airport_name->>'en' AS name, city->>'en' AS city,
           coordinates[0] AS lon, coordinates[1] AS lat
    FROM bookings.airports_data
\"\"\")
df_hotspot = df_delay_stats.merge(df_ap_coords, on='code')

m2 = folium.Map(location=[62, 90], zoom_start=3, tiles='CartoDB positron')

for _, ap in df_hotspot.iterrows():
    pct = float(ap['delay_pct'])
    # Color gradient: green (low delay) -> red (high delay)
    if pct < 3:
        color = '#2ecc71'
    elif pct < 5:
        color = '#f1c40f'
    elif pct < 7:
        color = '#f39c12'
    else:
        color = '#e74c3c'

    radius = max(4, min(18, ap['flights'] / 200))
    folium.CircleMarker(
        location=[ap['lat'], ap['lon']], radius=radius,
        color=color, fill=True, fill_color=color, fill_opacity=0.7, weight=2,
        popup=f"<b>{ap['name']}</b><br>{ap['city']}<br>"
              f"Flights: {ap['flights']}<br>Delay rate: {ap['delay_pct']}%"
    ).add_to(m2)

m2
"""))

# ── Cleanup ──
cells.append(nbf.v4.new_code_cell("conn.close()\nprint('Connection closed.')"))

nb.cells = cells
nbf.write(nb, '/home/andtega349/learning_posgre/notebooks/flight_analytics.ipynb')
print("Notebook created successfully.")
