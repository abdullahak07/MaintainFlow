from app.schemas import IncomingEmail
from app.services.extractor import RuleBasedExtractor


def test_extracts_address_category_and_high_urgency():
    email = IncomingEmail(
        sender_email="john.smith@example.com",
        subject="Leaking tap at 12 Smith Street",
        body="The kitchen tap is leaking badly. Thanks, John Smith",
    )
    result = RuleBasedExtractor().extract(email).data
    assert result.property_address == "12 Smith Street"
    assert result.category == "plumbing"
    assert result.urgency == "high"
    assert result.tenant_name == "John Smith"


def test_emergency_gas_leak():
    email = IncomingEmail(
        sender_email="sarah@example.com",
        subject="Gas smell at 45 Lake Drive",
        body="There is a strong gas leak smell in the kitchen.",
    )
    result = RuleBasedExtractor().extract(email).data
    assert result.urgency == "emergency"


def test_not_urgent_is_low():
    email = IncomingEmail(
        sender_email="ali@example.com",
        subject="Aircon at 7 King Avenue",
        body="The air conditioner is not cooling. It is not urgent and can be checked when convenient.",
    )
    result = RuleBasedExtractor().extract(email).data
    assert result.category == "hvac"
    assert result.urgency == "low"


def test_negated_sparking_does_not_trigger_emergency():
    email = IncomingEmail(
        sender_email="mia@example.com",
        subject="No power at 88 Ocean Road",
        body="We have no power. There is no smoke or sparking.",
    )
    result = RuleBasedExtractor().extract(email).data
    assert result.urgency == "high"


def test_smell_of_gas_triggers_emergency():
    email = IncomingEmail(
        sender_email="sarah@example.com",
        subject="Gas smell at 45 Lake Drive",
        body="There is a strong smell of gas in the kitchen.",
    )
    result = RuleBasedExtractor().extract(email).data
    assert result.urgency == "emergency"


def test_parses_json_from_code_fence():
    from app.services.extractor import _parse_json_object
    parsed = _parse_json_object('```json\n{"urgency":"high","category":"plumbing"}\n```')
    assert parsed["urgency"] == "high"
    assert parsed["category"] == "plumbing"
