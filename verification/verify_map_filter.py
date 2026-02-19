import time
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1280, 'height': 720})
    page = context.new_page()

    # Try both with and without base path just in case
    urls = [
        "http://localhost:8081/openroutes/app/world",
        "http://localhost:8081/app/world",
        "http://localhost:8081/"
    ]

    connected = False
    for url in urls:
        print(f"Trying {url}...")
        try:
            page.goto(url, timeout=5000)
            # Check for 404 text
            content = page.content()
            if "Unmatched Route" in content or "404" in page.title():
                print(f"404 at {url}")
                continue

            print(f"Connected to {url}!")
            connected = True
            break
        except Exception as e:
            print(f"Failed {url}: {e}")
            time.sleep(1)

    if not connected:
        print("Could not load any valid page.")
        page.screenshot(path="verification/failed_load.png")
        browser.close()
        return

    # If we are at root, try to find the map link.
    if "world" not in page.url:
        print(f"Landed at {page.url}, trying to navigate to World tab...")
        try:
            # Look for a link/button with 'map' or 'world' or icon
            # The tab bar icon is map-marker-radius or map-search.
            # Assuming the tab bar is visible at bottom.
            # But the tab label is localized.
            # Let's try direct navigation if possible using JS?
            # Or just click the second tab button?
            # Tabs are usually role="link" or "button".
            # The World tab is index 1 (second one)? No, index 1 in the list: index, world, share, setting.
            # So it's the 2nd tab.

            tabs = page.get_by_role("link").all()
            if len(tabs) >= 2:
                print("Clicking 2nd link (assuming World tab)")
                tabs[1].click()
                page.wait_for_timeout(3000)
        except Exception as e:
            print(f"Nav error: {e}")

    # Wait for app to stabilize
    print("Waiting for page load...")
    page.wait_for_timeout(10000)

    # Take screenshot of closed filter
    page.screenshot(path="verification/closed_filter.png")
    print("Captured closed_filter.png")

    print("Searching for Filter FAB...")
    buttons = page.get_by_role("button").all()
    target_btn = None

    for btn in buttons:
        try:
            box = btn.bounding_box()
            if box:
                # Check for top-left position (allow some margin)
                # MapFilterBar: top: 10, left: 10
                if box['x'] >= 0 and box['x'] < 100 and box['y'] >= 0 and box['y'] < 100:
                    # Check size (FAB is small)
                    if box['width'] < 80 and box['height'] < 80:
                        print(f"Found candidate button at ({box['x']}, {box['y']})")
                        target_btn = btn
                        break
        except:
            continue

    if target_btn:
        target_btn.click()
        print("Clicked filter button")
        page.wait_for_timeout(3000) # Wait for animation

        # Take screenshot of open filter
        page.screenshot(path="verification/open_filter.png")
        print("Captured open_filter.png")
    else:
        print("Could not find filter button! Saving debug screenshot.")
        page.screenshot(path="verification/debug_not_found.png")
        # print(page.content())

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
