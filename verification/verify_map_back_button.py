from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # URL with dummy data to avoid error screen
    url = 'http://localhost:8081/view?url=data:application/json,{"type":"FeatureCollection","features":[]}'

    print(f"Navigating to {url}")
    page.goto(url)

    # Wait for the map or title to load
    try:
        # Wait for something distinctive. "Route Map" is the default title.
        page.wait_for_selector('text=Route Map', timeout=15000)
        print("Title 'Route Map' found.")

        # Allow map to render (Leaflet might take a moment)
        page.wait_for_timeout(2000)

    except Exception as e:
        print(f"Error waiting for page load: {e}")

    # Capture screenshot
    output_path = "verification/map_view_standalone.png"
    page.screenshot(path=output_path)
    print(f"Screenshot taken at {output_path}")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
