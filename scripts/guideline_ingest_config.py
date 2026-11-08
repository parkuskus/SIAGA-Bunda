from urllib.parse import urlparse

from dotenv import dotenv_values


def load_ingest_env(env_file, expected_project_ref=None):
    values = {key: value for key, value in dotenv_values(env_file).items() if value is not None}
    if expected_project_ref:
        url = values.get("SUPABASE_URL", "")
        if urlparse(url).hostname is None or urlparse(url).hostname.split(".")[0] != expected_project_ref:
            raise ValueError("SUPABASE_URL does not match the expected staging project ref")
    return values
