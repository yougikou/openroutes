from playwright.sync_api import sync_playwright, Page, expect

def test_map_buttons_alignment(page: Page):
    # Mock the GeoJSON response specifically for the example domain
    page.route("https://example.com/route.geojson", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"type": "FeatureCollection", "features": []}'
    ))

    print("Navigating to map page...")
    # Increase timeout to 120 seconds for slow bundling
    page.goto("http://localhost:8081/map?url=https://example.com/route.geojson", timeout=120000)

    print("Waiting for Route Map title...")
    # Wait for the app to load
    expect(page.get_by_text("Route Map")).to_be_visible(timeout=60000)

    print("Waiting for Locate Me button...")
    locate_btn = page.get_by_label("Locate Me")
    expect(locate_btn).to_be_visible(timeout=10000)

    # Visual verification
    print("Taking screenshot...")
    page.wait_for_timeout(3000)
    page.screenshot(path="verification/map_buttons.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_map_buttons_alignment(page)
            print("Verification script ran successfully.")
        except Exception as e:
            print(f"Verification script failed: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
