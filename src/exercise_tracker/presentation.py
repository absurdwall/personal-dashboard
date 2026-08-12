from datetime import datetime


def friendly_departure(value: str) -> str:
    departure = datetime.fromisoformat(value)
    return (
        f"{departure.strftime('%A, %B')} {departure.day} "
        f"at {departure.strftime('%-I:%M %p')}"
    )
