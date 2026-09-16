"""Phase 7 browser regression: 13 center routes x 3 viewports (375/768/1440).

Logs in as demo.center.admin1, navigates each route capturing console errors,
page errors, request failures and legitimate hydration-failure markers.
Writes .p7browser.json for the report.
"""
import json
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
USER = "demo.center.admin1"
PASS = "Demo@12345"

ROUTES = [
    "/center",
    "/center/teachers",
    "/center/classrooms",
    "/center/groups",
    "/center/students",
    "/center/employees",
    "/center/finance",
    "/center/transport",
    "/center/communications",
    "/center/broadcast",
    "/center/reports",
    "/center/profile",
    "/center/settings",
]

VIEWPORTS = [("mobile-375", 375, 812), ("tablet-768", 768, 1024), ("desktop-1440", 1440, 900)]

# Legitimate hydration failure phrases ONLY. Note: "suppressHydrationWarning"
# (a valid React attribute) must NOT match, so we do not use the bare word.
HYDRATION_ERRORS = [
    "hydration failed",
    "hydration error",
    "did not match",
    "server rendered html",
    "expected server html",
    "text content did not match",
]

IGNORE_CONSOLE = [
    "download the react devtools",
    "data-sentry",
    "the resource",
    "favicon",
    "react devtools",
]


def main():
    results = {}
    all_ok = True
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context()
        page = ctx.new_page()
        login_ok, login_note = do_login(page)
        print(f"LOGIN: {'OK' if login_ok else 'FAIL'} {login_note}")
        if not login_ok:
            print("ABORT - could not log in")
            with open(".p7browser.json", "w") as f:
                json.dump({"login_ok": False, "note": login_note}, f, indent=2)
            browser.close()
            return

        for name, w, h in VIEWPORTS:
            vp = page.context.new_page()
            results[name] = {}
            for route in ROUTES:
                entry = check_route(vp, route, w, h)
                results[name][route] = entry
                status = "PASS" if entry["ok"] else ("HYDRATION" if entry.get("hydration") else "FAIL")
                if not entry["ok"]:
                    all_ok = False
                print(f"{name:14s} {route:22s} {status}")
            vp.close()
        ctx.close()
        browser.close()

    total = sum(len(v) for v in results.values())
    passed = sum(1 for v in results.values() for r in v.values() if r["ok"])
    print(f"\nTOTAL: {passed}/{total} PASS")
    summary = {
        "login_ok": True,
        "total": total,
        "passed": passed,
        "all_ok": all_ok,
        "results": results,
    }
    with open(".p7browser.json", "w") as f:
        json.dump(summary, f, indent=2, default=str)
    print("wrote .p7browser.json")


def do_login(page):
    page.goto(f"{BASE}/login", wait_until="networkidle", timeout=60000)
    page.fill('input[type="text"]', USER)
    page.fill('input[type="password"]', PASS)
    page.click('button[type="submit"]')
    try:
        page.wait_for_url("**/center**", timeout=45000)
    except Exception:
        pass
    page.wait_for_load_state("networkidle", timeout=45000)
    url = page.url
    if "/login" in url or ("login" in page.title().lower() and "center" not in url):
        return False, f"redirected to {url}"
    return True, f"landed {url}"


def check_route(page, route, w, h):
    console_errors = []
    page_errors = []
    request_failures = []
    page.set_viewport_size({"width": w, "height": h})
    page.on(
        "console",
        lambda msg: console_errors.append(msg.text)
        if msg.type == "error" and not any(i.lower() in msg.text.lower() for i in IGNORE_CONSOLE)
        else None,
    )
    page.on("pageerror", lambda exc: page_errors.append(str(exc)))
    page.on(
        "requestfailed",
        lambda req: request_failures.append(f"{req.method} {req.url} :: {req.failure}"),
    )
    try:
        page.goto(f"{BASE}{route}", wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(1200)
    except Exception as e:
        return {"ok": False, "error": f"navigation: {e}", "console": [], "pageerrors": [], "hydration": [], "reqfail": []}
    html = ""
    try:
        html = page.content()
    except Exception:
        pass
    lower = html.lower()
    hydration = [line for line in HYDRATION_ERRORS if line.lower() in lower]
    ok = (not console_errors) and (not page_errors) and (not hydration) and (len(request_failures) == 0)
    return {
        "ok": ok,
        "console": console_errors[:5],
        "pageerrors": page_errors[:5],
        "hydration": hydration,
        "reqfail": request_failures[:5],
    }


if __name__ == "__main__":
    main()

