from playwright.sync_api import Page, expect, sync_playwright

def test_sitemap(page: Page):
    print("Navigating to unmatched route to see sitemap link...")
    page.goto("http://localhost:8081/openroutes/app/world")

    print("Waiting for page load...")
    page.wait_for_timeout(2000)

    # Click Sitemap
    print("Clicking Sitemap...")
    page.get_by_text("Sitemap").click()

    page.wait_for_timeout(2000)
    print("Taking screenshot of sitemap...")
    page.screenshot(path="verification/sitemap.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_sitemap(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_sitemap.png")
            raise e
        finally:
            browser.close()
