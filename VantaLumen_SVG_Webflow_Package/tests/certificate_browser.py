"""Certificate regression checks in Chrome. Run: python tests/certificate_browser.py.

Requires the Python playwright package and an installed Chrome browser.
Serves the local package on a temporary loopback port; no external assets required.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json

from playwright.sync_api import sync_playwright, expect

BASE = Path(__file__).resolve().parents[1]
OUTPUT = BASE / '.qa-scenes'
OUTPUT.mkdir(exist_ok=True)


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(BASE)))
Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}'
webflow = ('<!doctype html><html><head><meta name="viewport" '
           'content="width=device-width, initial-scale=1">'
           + (BASE / 'webflow/01_HEAD.html').read_text(encoding='utf-8')
           + '</head><body>'
           + (BASE / 'webflow/02_BODY_EMBED.html').read_text(encoding='utf-8')
           + '<script src="/assets/vendor/gsap.min.js"></script>'
           + '<script src="/assets/vendor/ScrollTrigger.min.js"></script>'
           + (BASE / 'webflow/03_FOOTER.html').read_text(encoding='utf-8')
           + '</body></html>')
results = []


def route_local(route):
    if route.request.url == origin + '/webflow-test':
        route.fulfill(body=webflow, content_type='text/html')
    elif route.request.url.startswith(origin + '/'):
        route.continue_()
    else:
        route.abort()


def check_closed(page):
    assert page.locator('.vs-certificate-dialog').evaluate(
        "d => !d.open && d.hidden && getComputedStyle(d).display === 'none' "
        "&& d.getBoundingClientRect().height === 0"), page.evaluate("""() => ({
            scroll:scrollY, finale:document.querySelector('.vs-finale').getBoundingClientRect().toJSON(),
            open:document.querySelector('.vs-certificate-dialog').open,
            hidden:document.querySelector('.vs-certificate-dialog').hidden
        })""")
    assert page.locator('.vs-certificate-preview svg').count() == 0


def go(page, selector):
    page.locator(selector).evaluate("el => el.scrollIntoView({behavior:'instant',block:'start'})")
    page.wait_for_timeout(120)


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        for filename in ['RISE_Story.html', 'index.html', 'VantaLumen_SVG_Preview.html', 'webflow-test']:
            # Closed HTML must be safe even before JavaScript loads or when it is disabled.
            static = browser.new_page(java_script_enabled=False)
            static.route('**/*', route_local)
            static.goto(origin + '/' + filename)
            expect(static.locator('.vs-certificate-dialog')).to_be_hidden()
            expect(static.locator('.vs-certificate')).to_be_hidden()
            static.close()
            for label, viewport, reduced in [
                ('desktop', {'width': 1440, 'height': 900}, 'no-preference'),
                ('mobile', {'width': 390, 'height': 844}, 'reduce'),
            ]:
                print(f'Checking {filename} / {label}', flush=True)
                page = browser.new_page(viewport=viewport, reduced_motion=reduced)
                page.route('**/*', route_local)
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(origin + '/' + filename)
                page.wait_for_function("document.getElementById('vanta-svg-story').dataset.ready === 'true'")
                page.evaluate("""() => {
                    window.certificateEvents=[];
                    const record=type=>{
                        certificateEvents.push({type,scroll:scrollY,
                            bounds:document.querySelector('.vs-finale').getBoundingClientRect().toJSON(),
                            open:document.querySelector('.vs-certificate-dialog').open});
                        if(certificateEvents.length>12)certificateEvents.shift();
                    };
                    addEventListener('scroll',()=>record('scroll'));
                    addEventListener('resize',()=>record('resize'));
                    document.querySelector('.vs-certificate-dialog').addEventListener('close',()=>record('close'));
                }""")
                check_closed(page)
                expect(page.locator('.vs-certificate')).to_be_hidden()
                assert page.locator('.vs-certificate').evaluate('el => el.inert')
                # Every earlier chapter, including the one directly before the finale.
                finale = int(page.locator('.vs-finale').get_attribute('data-chapter'))
                for chapter in range(finale):
                    go(page, f'#vs-chapter-{chapter}')
                    check_closed(page)
                    assert page.locator('#legacy-certificate').evaluate(
                        "el => getComputedStyle(el).visibility === 'hidden'")
                go(page, '.vs-finale')
                expect(page.locator('.vs-certificate')).to_be_visible()
                expect(page.locator('.vs-create-certificate')).to_be_disabled()
                check_closed(page)
                # Exercise the existing activities and passport rules through their DOM controls.
                page.evaluate("""() => {
                    const root=document.getElementById('vanta-svg-story'),q=s=>root.querySelector(s);
                    for(const world of ['moon','mars']){
                        root.vantaSVG.chooseWorld(world);
                        for(let i=0;i<40&&q('.vs-open-briefing').disabled;i++)q('.vs-brush').click();
                        for(let i=0;i<3;i++){
                            q(`[data-part="${i}"]`).click();q(`.vs-marker[data-marker="${i}"]`).click();
                        }
                        q('#vs-year').value='2076';q('#vs-year').dispatchEvent(new Event('input'));
                        q('.vs-record').click();
                    }
                }""")
                go(page, '.vs-finale')
                expect(page.locator('.vs-create-certificate')).to_be_disabled()
                page.locator('#vs-explorer-name').fill('Nguyễn An & RISE')
                expect(page.locator('.vs-create-certificate')).to_be_enabled()
                check_closed(page)  # Entering a name must not open the preview automatically.
                page.locator('.vs-create-certificate').click()
                expect(page.locator('.vs-certificate-dialog')).to_be_visible()
                assert page.locator('.vs-certificate-dialog').evaluate('d => d.matches(":modal")')
                expect(page.locator('.vs-certificate-preview')).to_contain_text('Nguyễn An & RISE')
                assert page.locator('.vs-certificate-dialog').evaluate(
                    'd => d.getBoundingClientRect().width <= innerWidth')
                if filename == 'RISE_Story.html':
                    page.screenshot(path=str(OUTPUT / f'certificate-{label}.png'))
                # Print sheets are temporary and export remains available.
                page.evaluate('window.printCalls=0; window.print=()=>window.printCalls++')
                page.locator('.vs-print-certificate').click()
                try:
                    page.wait_for_function('window.printCalls === 1', timeout=5000)
                except Exception:
                    print(page.evaluate('({events:certificateEvents,printed:printCalls})'), flush=True)
                    raise
                assert page.locator('.vs-certificate-print').count() == 1
                page.evaluate("dispatchEvent(new Event('afterprint'))")
                assert page.locator('.vs-certificate-print').count() == 0
                with page.expect_download() as download:
                    page.locator('.vs-download-certificate').click()
                assert download.value.suggested_filename == 'VantaLumen_RISE_Certificate.svg'
                page.keyboard.press('Escape')
                page.wait_for_function("document.querySelector('.vs-certificate-dialog').hidden")
                check_closed(page)
                page.locator('.vs-create-certificate').click()
                page.locator('.vs-certificate-close').click()
                check_closed(page)
                # Leaving the finale while the modal is open closes it and cannot jump back via focus.
                page.locator('.vs-create-certificate').click()
                go(page, '#vs-chapter-0')
                check_closed(page)
                expect(page.locator('.vs-certificate')).to_be_hidden()
                assert page.evaluate('scrollY') < 20
                page.locator('.vs-create-certificate').dispatch_event('click')
                check_closed(page)
                go(page, '.vs-finale')
                expect(page.locator('#vs-explorer-name')).to_have_value('Nguyễn An & RISE')
                check_closed(page)
                if page.locator('.vs-cta').count():
                    page.locator('.vs-create-certificate').click()
                    go(page, '.vs-cta')
                    check_closed(page)
                    expect(page.locator('.vs-certificate')).to_be_hidden()
                page.reload()
                page.wait_for_function("document.getElementById('vanta-svg-story').dataset.ready === 'true'")
                check_closed(page)
                assert not errors, errors
                results.append({'file': filename, 'viewport': label, 'status': 'PASS'})
                print(f'PASS {filename} / {label}', flush=True)
                page.close()
        browser.close()
    (OUTPUT / 'certificate-browser-results.json').write_text(json.dumps(results, indent=2), encoding='utf-8')
finally:
    server.shutdown()
