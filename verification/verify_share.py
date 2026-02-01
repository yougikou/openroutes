from playwright.sync_api import Page, expect, sync_playwright
import re

def verify_share_screen(page: Page):
    print("Navigating to Share Screen...")
    response = page.goto("http://localhost:8081/openroutes/share/")
    print(f"Response status: {response.status}")

    # Wait for content to load
    print("Waiting for page content...")
    # The title might be different based on locale.
    # English: Share Your Routes
    # Japanese: GPS軌跡ログを共有
    # Chinese: 共享
    try:
        expect(page.locator("#root")).to_contain_text(re.compile(r"Share Your Routes|GPS軌跡ログを共有|共享"), timeout=10000)
    except Exception as e:
        print("Title not found.")
        page.screenshot(path="verification/error_wait.png")
        print(page.content())
        raise e

    print("Checking for new labels...")
    # Labels: Type/Difficulty
    # EN: Type, Difficulty
    # JA: タイプ, 難易度
    # ZH: 类型, 难度

    # We can use regex to match any of them
    type_regex = re.compile(r"Type|类型|タイプ")
    diff_regex = re.compile(r"Difficulty|难度|難易度")

    try:
        expect(page.locator("#root")).to_contain_text(type_regex)
        print("Found Type label.")
    except:
        print("Type label not found.")

    try:
        expect(page.locator("#root")).to_contain_text(diff_regex)
        print("Found Difficulty label.")
    except:
        print("Difficulty label not found.")

    # Check for Edit button
    # EN: Edit, JA: 編集, ZH: 编辑
    edit_regex = re.compile(r"Edit|编辑|編集")
    try:
        expect(page.locator("#root")).to_contain_text(edit_regex)
        print("Found Edit button.")
    except:
        print("Edit button not found.")

    # Check for Upload Button text (Target change)
    # JA: GPX/KML アップロード
    upload_regex = re.compile(r"GPX/KML アップロード|Upload GPX/KML|上传 GPX/KML")
    try:
        expect(page.locator("#root")).to_contain_text(upload_regex)
        print("Found Upload button text.")
    except:
        print("Upload button text not found.")

    print("Taking screenshot...")
    page.screenshot(path="verification/share_screen.png", full_page=True)
    print("Screenshot saved.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Mobile viewport to ensure mobile layout
        context = browser.new_context(viewport={"width": 390, "height": 844})
        page = context.new_page()
        try:
            verify_share_screen(page)
        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
