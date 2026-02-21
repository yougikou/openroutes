from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 375, "height": 812})

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

            page.evaluate(f"""
                window.localStorage.setItem('offline_maps_metadata', JSON.stringify({str(offline_map_data).replace("'", '"').replace("False", "false").replace("True", "true")}));
            """)

            print("Navigating to Offline Maps...")
            page.goto("http://localhost:8081/app/offline")
            page.wait_for_timeout(3000)

            page.screenshot(path="/home/jules/verification/offline_screen_2.png")
            print("Screenshot taken: offline_screen_2.png")

            # Find buttons
            buttons = page.get_by_role("button").all()
            print(f"Found {len(buttons)} buttons")

            view_btn = None
            delete_btn = None

            for btn in buttons:
                txt = btn.text_content()
                print(f"Button text: '{txt}'")
                if "View on Map" in txt or "VIEW ON MAP" in txt:
                    view_btn = btn
                # Delete button likely has no text or icon text
                if not txt.strip():
                     # Check if it's near view_btn?
                     # Let's just blindly assume the last button is the FAB or delete?
                     # There are no FABs in offline screen.
                     # But there is a back button in header if navigatable? No, Appbar.Header has no back button in my code (unless router adds it).
                     # My code: <Appbar.Header elevated><Appbar.Content title.../></Appbar.Header>
                     pass

            # If we found view button, the delete button should be next to it.
            if view_btn:
                # Get parent row?
                # The structure is Row -> [Button, IconButton]
                # So they are siblings.
                # Let's get the parent of view_btn
                # parent = view_btn.locator("..")
                # delete_btn = parent.get_by_role("button").last
                # But get_by_role scopes to subtree.

                # Let's try to click the button visually to the right of View button.
                bbox = view_btn.bounding_box()
                if bbox:
                    x = bbox["x"] + bbox["width"] + 20
                    y = bbox["y"] + bbox["height"] / 2
                    print(f"Clicking at {x}, {y}")
                    page.mouse.click(x, y)
                    page.wait_for_timeout(1000)

                    page.screenshot(path="/home/jules/verification/dialog_screen.png")
                    print("Screenshot taken: dialog_screen.png")

                    if page.get_by_text("Delete Map").is_visible():
                        print("SUCCESS: Dialog visible")
                    else:
                        print("FAILURE: Dialog not visible")
            else:
                print("FAILURE: View button not found")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
