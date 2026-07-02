import requests

url = "http://localhost:8000/api/approval-forms/submit"
payload = {
    "entryEntityType": "Club",
    "entryEntityName": "ASTRONOMY CLUB",
    "entryEventName": "Nakshatra 2026",
    "entryEventType": "Regular",
    "entryEventCategory": "Test Category",
    "entryOrganizedBy": "Test Org",
    "entryVenue": "Test Venue",
    "entryDateTime": "2026-07-01T10:00",
    "entryTechSkill": "Skill",
    "entryOtherSkill": "Other",
    "entrySdg": "SDG1",
    "entryUgc": "UGC1",
    "entryEventMode": "Online",
    "entryOutcome": "Test Outcome",
    "entryParticipantsCount": "50",
    "entryDescription": "Test Desc",
    "entryCoordName": "Test Coord",
    "entryCoordEid": "E123",
    "entryCoordEmail": "test@test.com",
    "entryCoordDesignation": "Faculty",
    "entryCoordContact": "9876543210",
    "entryPartInternal": True,
    "entryPartNational": False,
    "entryPartInterdept": False,
    "entryFundCentral": False,
    "entryFundDept": True,
    "entryGuestName": "Guest 1",
    "entryGuestAffil": "Affil 1",
    "entryGuestSubject": "Subj 1",
    "entrySection": "Sec A",
    "entryBudgApproved": "5000",
    "entryBudgUsed": "0",
    "entryBudgBalance": "5000",
    "entryBudgSponsor": "100",
    "entryBudgRequired": "1500"
}

resp = requests.post(url, json=payload)
print(resp.status_code, resp.text)
