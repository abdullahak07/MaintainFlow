from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app


def setup_function():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def test_health():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


def test_end_to_end_create_approve_and_send_dry_run():
    with TestClient(app) as client:
        created = client.post(
            "/api/requests",
            json={
                "sender_email": "john.smith@example.com",
                "subject": "Leaking tap at 12 Smith Street",
                "body": "Kitchen tap is leaking badly. Thanks, John Smith",
            },
        )
        assert created.status_code == 201
        item = created.json()
        assert item["status"] == "pending_approval"
        assert item["property_address"] == "12 Smith Street"

        approved = client.post(f"/api/requests/{item['id']}/approve", json={"note": "Reviewed"})
        assert approved.status_code == 200
        assert approved.json()["status"] == "response_sent"
        assert approved.json()["response_sent_at"] is not None


def test_reject_request():
    with TestClient(app) as client:
        created = client.post(
            "/api/requests",
            json={"sender_email": "x@example.com", "subject": "Door issue", "body": "Door lock is stiff, please inspect."},
        )
        request_id = created.json()["id"]
        rejected = client.post(f"/api/requests/{request_id}/reject", json={"note": "Need address"})
        assert rejected.status_code == 200
        assert rejected.json()["status"] == "rejected"


def test_dashboard_and_form_work():
    with TestClient(app) as client:
        dashboard = client.get("/")
        assert dashboard.status_code == 200
        assert "Maintenance inbox, structured." in dashboard.text

        submitted = client.post(
            "/requests/new",
            data={
                "sender_email": "mia.chen@example.com",
                "subject": "No power at 88 Ocean Road",
                "body": "We have no power at 88 Ocean Road. Thanks, Mia Chen",
            },
            follow_redirects=True,
        )
        assert submitted.status_code == 200
        assert "88 Ocean Road" in submitted.text
        assert "Draft tenant response" in submitted.text
