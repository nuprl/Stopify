/**
 * This program uses Selenium to run a Stopify benchmark in a browser.
 *
 * The program must have been compiled with the '--webpack' flag. If not,
 * the benchmark will timeout after several minutes.
 *
 * There are a few steps involved:
 *
 * 1. We serve the dist/ directory and the directory containing the benchmark
 *    on port 9999 by default. (Configure using --local-host and --local-port.)
 *
 * 2. We use Selenium to start a browser (in headless mode, if we know how).
 *    Using Remote WebDriver, it is possible to start the browser on a remote
 *    machine. To do so, run the following command on the remote machine:
 *
 *    $ java -jar selenium-server-standalone-{VERSION}.jar
 *
 *    and use the --remote-url parameter on this program.
 *
 * 3. Using Selenium, we direct the browser to fetch the page. If the browser
 *    is on a remote machine, ensure that --local-host is set to the IP address
 *    of the local machine.
 */
import * as selenium from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import * as path from 'path';
import { parseRuntimeOpts } from './cli-parse';
import * as os from 'os';
import { benchmarkUrl } from './browserLine';
import * as express from 'express';

process.env.MOZ_HEADLESS = "1";

const stdout = process.stdout;
const args = process.argv.slice(2);
const opts = parseRuntimeOpts(args);
const src = benchmarkUrl(args);

// NOTE(sam): No typing for `headless()` option as of 8/30/2017.
// I've opened a PR to DefinitelyTyped to fix this.
// https://github.com/DefinitelyTyped/DefinitelyTyped/pull/19463
const chromeOpts = (<any>new chrome.Options()).headless();

const loggingPrefs = new selenium.logging.Preferences();
loggingPrefs.setLevel('browser', 'all');

let builder = new selenium.Builder()
  .forBrowser(opts.env)
  .setLoggingPrefs(loggingPrefs)
  .setChromeOptions(chromeOpts);

if (opts.remoteWebDriverUrl) {
  builder = builder.usingServer(opts.remoteWebDriverUrl);
}

const driver = builder.build();
const app = express();

const benchmarkName = path.basename(opts.filename);

app.use(express.static(path.join(__dirname, '../../dist')));
app.use(express.static(path.dirname(opts.filename)));

const server = app.listen(opts.testPort!, '0.0.0.0', 100, () => {
  const port = server.address().port
  const url = `http://${opts.testHost}:${port}/benchmark.html#${src}`;
  console.log(`GET ${url}`);
  driver.get(url)
    .then(_ => driver.wait(selenium.until.titleIs('done'), 8 * 60 * 1000))
    .then(_ => driver.findElement(selenium.By.id('data')))
    .then(e => e.getAttribute("value"))
    .then(s => stdout.write(s))
    .catch(exn => stdout.write(`Got an exception from Selenium: ${exn}`))
    .then(_ => driver.quit())
    .then(_ => server.close());
});