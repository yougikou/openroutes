import json
import urllib.parse
from playwright.sync_api import sync_playwright

route_item = {
  "id": 999,
  "title": "Test Route - Hiking & Cycling",
  "description": "A beautiful test route.",
  "distance": 10.5,
  "duration": 2.5,
  "user": {
    "login": "testuser",
    "avatar_url": "https://avatars.githubusercontent.com/u/1?v=4"
  },
  "created_at": "2023-01-01T10:00:00Z",
  "labels": [
    { "id": 1, "name": "hiking" },
    { "id": 2, "name": "cycling" },
    { "id": 3, "name": "moderate" }
  ],
  "coverimg": { "uri": "" },
  "geojson": { "uri": "" }
}

json_str = json.dumps(route_item)
encoded_item = urllib.parse.quote(json_str)
# Try without base path
url = f"http://localhost:8081/app/detail?item={encoded_item}"

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    try:
        print(f"Navigating to {url}")
        page.goto(url, timeout=60000)

        # Wait for content to load
        page.wait_for_selector('text="Test Route - Hiking & Cycling"', timeout=60000)

        # Take screenshot
        page.screenshot(path="verification_screenshot.png", full_page=True)
        print("Screenshot saved to verification_screenshot.png")
    except Exception as e:
        print(f"Error: {e}")
        # Capture failure screenshot
        try:
             page.screenshot(path="verification_failure.png")
        except:
             pass
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
