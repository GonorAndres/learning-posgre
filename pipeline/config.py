"""
Pipeline configuration -- reads from environment variables with sensible defaults.
Uses Application Default Credentials (ADC) for BigQuery auth.
"""
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# PostgreSQL (local Docker)
PG_HOST = os.getenv('PG_HOST', 'localhost')
PG_PORT = int(os.getenv('PG_PORT', '5432'))
PG_USER = os.getenv('PG_USER', 'app_user')
PG_PASSWORD = os.getenv('PG_PASSWORD', 'dev_secret_123')
PG_DATABASE = os.getenv('PG_DATABASE', 'demo')
PG_SCHEMA = os.getenv('PG_SCHEMA', 'bookings')

# BigQuery (uses ADC from gcloud auth)
BQ_PROJECT = os.getenv('BQ_PROJECT', os.popen('gcloud config get-value project 2>/dev/null').read().strip())
BQ_DATASET = os.getenv('BQ_DATASET', 'airlines_demo')
BQ_LOCATION = os.getenv('BQ_LOCATION', 'US')

# Pipeline settings
BATCH_SIZE = int(os.getenv('BATCH_SIZE', '50000'))
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'output')

# Tables to migrate (in dependency order)
TABLES = [
    'aircrafts_data',
    'airports_data',
    'seats',
    'bookings',
    'tickets',
    'flights',
    'ticket_flights',
    'boarding_passes',
]
