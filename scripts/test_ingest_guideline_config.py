import tempfile
import unittest
from pathlib import Path

from guideline_ingest_config import load_ingest_env


class IngestEnvironmentTests(unittest.TestCase):
    def test_reads_the_explicit_staging_file(self):
        with tempfile.TemporaryDirectory() as directory:
            env_file = Path(directory) / ".env.staging"
            env_file.write_text("SUPABASE_URL=https://gjizoreqciqelmkakluz.supabase.co\nLLM_MODEL=staging-model\n")
            values = load_ingest_env(env_file, "gjizoreqciqelmkakluz")
        self.assertEqual(values["LLM_MODEL"], "staging-model")

    def test_refuses_the_production_project_for_staging_ingestion(self):
        with tempfile.TemporaryDirectory() as directory:
            env_file = Path(directory) / ".env.staging"
            env_file.write_text("SUPABASE_URL=https://sepindjvfvzxchesrtct.supabase.co\n")
            with self.assertRaisesRegex(ValueError, "staging project ref"):
                load_ingest_env(env_file, "gjizoreqciqelmkakluz")


if __name__ == "__main__":
    unittest.main()
