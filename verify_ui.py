from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 375, "height": 812})

        try:
            # 1. Navigate to home
            print("Navigating to home...")
            # Try root first, as dev server might be at root
            page.goto("http://localhost:8081/")
            page.wait_for_load_state("networkidle")

            # 2. Inject fake data
            print("Injecting fake data...")
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

            # Need to reload or force re-render.
            # Navigating to /openroutes/app/offline directly might be easier if routing works.
            # But let's try injecting then navigating via tab.

            page.evaluate(f"""
                window.localStorage.setItem('offline_maps_metadata', JSON.stringify({str(offline_map_data).replace("'", '"').replace("False", "false").replace("True", "true")}));
            """)

            # 3. Navigate to Offline Maps
            # The tab bar icon/label.
            # In English, bottom_offline is "Map Cache".
            # Let's find by role link or button with text "Map Cache"
            # Since React Navigation uses buttons usually.

            print("Clicking 'Map Cache' tab...")
            # Use a broad locator first
            tab = page.get_by_text("Map Cache")
            if tab.count() > 0:
                tab.click()
            else:
                print("Tab 'Map Cache' not found, trying URL navigation...")
                page.goto("http://localhost:8081/app/offline")

            page.wait_for_timeout(3000) # Wait for animation/loading

            page.screenshot(path="/home/jules/verification/offline_screen.png")
            print("Screenshot taken: offline_screen.png")

            # 4. Verify Title
            if page.get_by_text("Offline Maps (Beta)").is_visible():
                print("FAILURE: Beta label found in title")

            if page.get_by_text("Offline Maps").is_visible():
                print("SUCCESS: Title 'Offline Maps' found")
            else:
                print("FAILURE: Title 'Offline Maps' not found")
                # Debug HTML
                with open("/home/jules/verification/page_dump.html", "w") as f:
                    f.write(page.content())

            # 5. Verify List Item
            if page.get_by_text("Test Map for Deletion").is_visible():
                print("SUCCESS: List item found")
            else:
                print("FAILURE: List item not found")
                return

            # 6. Click Delete
            # The delete button is an IconButton.
            # Let's find all buttons and try the one that looks like delete or is near the item.
            # The item row has "View on Map" button.
            view_btn = page.get_by_text("View on Map")
            # The delete button is likely the next sibling in DOM or visual order.
            # Let's target by role button inside the list item container.

            # Find the list item container
            # It contains "Test Map for Deletion"
            item = page.get_by_text("Test Map for Deletion").locator("..").locator("..")
            # This is fragile.

            # Let's just find the last button on page, since it's the only item.
            # There are tab buttons at bottom.
            # The list item is in main content.
            # The delete button is usually rendered after "View on Map".

            print("Clicking delete button...")
            # We can use the fact that IconButton renders an icon.
            # If MaterialCommunityIcons is used, it might be an SVG or font.
            # If font, the text content is the ligature.
            # "delete" is likely the ligature for delete icon.

            # Try finding by text "delete" inside a button-like element?
            # Or just assume the structure:
            # List Item -> Right side -> Button(View) + IconButton(Delete)

            # Let's inspect the buttons in the content area.
            # Content area is usually scrollview.

            # Try clicking the button that is NOT "View on Map" and NOT a tab.
            all_buttons = page.get_by_role("button").all()
            target_btn = None
            for btn in all_buttons:
                txt = btn.text_content()
                if "View on Map" in txt:
                    continue
                if "Map Cache" in txt or "Explore" in txt: # Tabs
                    continue
                # If it has no text, it might be the icon button
                if not txt or len(txt.strip()) == 0 or len(txt) < 2: # Icons are often short or empty text
                     # It might be the back button if present? No back button here.
                     # Check if it is visible
                     if btn.is_visible():
                         target_btn = btn
                         # We found a candidate, let's break?
                         # But what if there are other icon buttons?
                         # The delete button is red (theme.colors.error).
                         # We can check style? Hard in Playwright without eval.
                         pass

            # Actually, let's look for the button after "View on Map".
            # Playwright `locator.filter` is good.
            # Find a view that contains "View on Map" and a button.

            # Simpler approach: click coordinates relative to "View on Map".
            # "View on Map" button bbox. Delete button should be to the right.

            view_bbox = page.get_by_text("View on Map").bounding_box()
            if view_bbox:
                # Click 50px to the right of the button center + half width
                x = view_bbox["x"] + view_bbox["width"] + 20
                y = view_bbox["y"] + view_bbox["height"] / 2
                page.mouse.click(x, y)
                print(f"Clicked at {x}, {y}")
            else:
                print("Could not find View on Map button bbox")

            page.wait_for_timeout(1000)

            page.screenshot(path="/home/jules/verification/dialog_screen.png")
            print("Screenshot taken: dialog_screen.png")

            # 7. Verify Dialog
            if page.get_by_text("Delete Map").is_visible():
                print("SUCCESS: Dialog Title 'Delete Map' found")
            else:
                print("FAILURE: Dialog Title 'Delete Map' not found")

            if page.get_by_text("Are you sure you want to delete this offline map?").is_visible():
                print("SUCCESS: Dialog Message found")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error_trace.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
