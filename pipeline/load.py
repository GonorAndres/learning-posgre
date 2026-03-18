"""
Load transformed DataFrames into BigQuery.
Uses google-cloud-bigquery with Application Default Credentials.
"""
import time
import pandas as pd
from google.cloud import bigquery
from config import BQ_PROJECT, BQ_DATASET, BQ_LOCATION


def get_bq_client() -> bigquery.Client:
    return bigquery.Client(project=BQ_PROJECT)


def ensure_dataset(client: bigquery.Client):
    """Create the dataset if it doesn't exist."""
    dataset_ref = bigquery.DatasetReference(BQ_PROJECT, BQ_DATASET)
    dataset = bigquery.Dataset(dataset_ref)
    dataset.location = BQ_LOCATION
    client.create_dataset(dataset, exists_ok=True)
    print(f"  Dataset {BQ_PROJECT}.{BQ_DATASET} ready.")


def load_table(client: bigquery.Client, table: str, df: pd.DataFrame):
    """Load a DataFrame into BigQuery, replacing existing data."""
    table_id = f"{BQ_PROJECT}.{BQ_DATASET}.{table}"
    print(f"  Loading {table}: {len(df):,} rows -> {table_id}...", end=" ", flush=True)
    start = time.time()

    job_config = bigquery.LoadJobConfig(
        write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
        autodetect=True,
    )

    job = client.load_table_from_dataframe(df, table_id, job_config=job_config)
    job.result()  # Wait for completion

    elapsed = time.time() - start
    loaded = client.get_table(table_id)
    print(f"{loaded.num_rows:,} rows loaded in {elapsed:.1f}s")


def load_all(data: dict[str, pd.DataFrame]):
    """Load all transformed tables into BigQuery."""
    client = get_bq_client()
    ensure_dataset(client)
    for table, df in data.items():
        load_table(client, table, df)
