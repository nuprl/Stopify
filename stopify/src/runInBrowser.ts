/**
 * This program uses Selenium to run a Stopify benchmark in a browser.
 *
 * There are a few steps involved:
 *
 * 1. We serve the dist/ directory and the directory containing the benchmark
 *    on port 9999.
 *
 * 2. We use Selenium to start a browser (in headless mode, if we know how).
 *
 * 3. Using Selenium, we direct the browser to fetch the page.
 */
import * as selenium from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import * as path from 'path';
import { parseRuntimeOpts } from './parse-runtime-opts';
import { benchmarkUrl } from './browserLine';
import * as express from 'express';

process.env.MOZ_HEADLESS = "1";

const stdout = process.stdout;
const [ browser, ...args ] = process.argv.slice(2);
const opts = parseRuntimeOpts(args);
const src = benchmarkUrl(args);

// NOTE(sam): No typing for `headless()` option as of 8/30/2017.
// I've opened a PR to DefinitelyTyped to fix this.
// https://github.com/DefinitelyTyped/DefinitelyTyped/pull/19463
const chromeOpts = (<any>new chrome.Options())
  .headless()
  .addArguments(['--js-flags', '--harmony_tailcalls']);

const loggingPrefs = new selenium.logging.Preferences();
loggingPrefs.setLevel('browser', 'all');

let builder = new selenium.Builder()
  .forBrowser(browser)
  .setLoggingPrefs(loggingPrefs)
  .setChromeOptions(chromeOpts);

const driver = builder.build();
const app = express();

app.use(express.static(path.join(__dirname, '../../dist')));
app.use(express.static(path.dirname(opts.filename)));
app.use(express.static(path.join(__dirname, '../../../stopify-continuations/dist')));

let exitCode = 0;
const server = app.listen(() => {
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/benchmark.html#${src}`;
  console.log(`GET ${url}`);
  driver.get(url)
    .then(_ => driver.wait(selenium.until.titleIs('done'), 8 * 60 * 1000))
    .then(_ => driver.findElement(selenium.By.id('data')))
    .then(e => e.getAttribute("value"))
    .then(s => {
      stdout.write(s);
      if (!s.endsWith('OK.\n')) {
        exitCode = 1;
      }
    })
    .catch(exn => {
      stdout.write(`Got an exception: ${exn}`);
      exitCode = 1;
    })
    .then(_ => driver.quit())
    .then(_ => server.close())
    .then(_ => process.exit(exitCode));
});
