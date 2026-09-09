import json
from pathlib import Path

from app.database import SessionLocal, init_db
from app.schemas import IncomingEmail
from app.services.workflow import ingest_email


def main() -> None:
    init_db()
    path = Path(__file__).resolve().parents[1] / "sample_data" / "emails.json"
    samples = json.loads(path.read_text(encoding="utf-8"))
    with SessionLocal() as db:
        for sample in samples:
            item = ingest_email(db, IncomingEmail.model_validate(sample))
            print(f"Seeded request #{item.id}: {item.property_address} [{item.urgency}]")


if __name__ == "__main__":
    main()
