from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Set locale to ja-JP to match what server seems to pick up
        context = browser.new_context(viewport={"width": 375, "height": 812}, locale="ja-JP")
        page = context.new_page()

        try:
            print("Navigating to home...")
            page.goto("http://localhost:8081/")
            page.wait_for_load_state("networkidle")

            # Inject data
            offline_map_data = [
                {
                    "id": 12345,
                    "title": "Test Map for Deletion",
                    "savedAt": 1678888888000,
                    "tileCount": 10,
                    "size": 102400,
                    "geojson": { "uri": "https://example.com/route.geojson" },
                    "user": { "login": "tester", "avatar_url": "https://example.com/avatar.png" },
                    "created_at": "2023-01-01T00:00:00Z",
                    "labels": [],
                    "body": "Test body",
                    "number": 12345
                }
            ]

            # We inject data for both keys just in case
            page.evaluate(f"""
                window.localStorage.setItem('offline_maps_metadata', JSON.stringify({str(offline_map_data).replace("'", '"').replace("False", "false").replace("True", "true")}));
            """)

            print("Navigating to Offline Maps...")
            page.goto("http://localhost:8081/app/offline")
            page.wait_for_timeout(3000)

            page.screenshot(path="/home/jules/verification/offline_screen_ja.png")
            print("Screenshot taken: offline_screen_ja.png")

            # Verify Title (Japanese: オフライン地図) without Beta
            if page.get_by_text("オフライン地図 (Beta)").is_visible():
                print("FAILURE: Beta label found")
            elif page.get_by_text("オフライン地図").is_visible():
                print("SUCCESS: Title found")
            else:
                print("FAILURE: Title not found")

            # Click Delete
            # Find the view button first
            view_btn = page.get_by_role("button", name="地図で見る")
            if view_btn.count() > 0:
                print("Found view button")
                bbox = view_btn.bounding_box()
                if bbox:
                    # Click right of view button
                    x = bbox["x"] + bbox["width"] + 25 # Slightly more spacing
                    y = bbox["y"] + bbox["height"] / 2
                    print(f"Clicking at {x}, {y}")
                    page.mouse.click(x, y)
                    page.wait_for_timeout(1000)

                    page.screenshot(path="/home/jules/verification/dialog_screen_ja.png")
                    print("Screenshot taken: dialog_screen_ja.png")

                    # Verify Dialog
                    if page.get_by_text("地図を削除").is_visible():
                        print("SUCCESS: Dialog Title found")
                    else:
                        print("FAILURE: Dialog Title not found")

                    if page.get_by_text("このオフライン地図を削除してもよろしいですか？").is_visible():
                         print("SUCCESS: Dialog Message found")
            else:
                print("FAILURE: View button not found")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            context.close()
            browser.close()

if __name__ == "__main__":
    run()
