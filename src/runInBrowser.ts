import * as selenium from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import * as path from 'path';
import * as runtime from './runtime/default';
import * as os from 'os';
import { encodeArgs } from './browserLine';

process.env.MOZ_HEADLESS = "1";

const stdout = process.stdout;
const args = process.argv.slice(2);
const opts = runtime.parseRuntimeOpts(args);
const src = encodeArgs(args);

// NOTE(sam): No typing for `headless()` option as of 8/30/2017.
// I've opened a PR to DefinitelyTyped to fix this.
// https://github.com/DefinitelyTyped/DefinitelyTyped/pull/19463
const chromeOpts = (<any>new chrome.Options()).headless();

const loggingPrefs = new selenium.logging.Preferences();
loggingPrefs.setLevel('browser', 'all');
const driver = new selenium.Builder()
  .forBrowser(opts.env)
  .setLoggingPrefs(loggingPrefs)
  .setChromeOptions(chromeOpts)
  .build();

driver.get(src);
driver.wait(selenium.until.titleIs('done'), 5 * 60 * 1000);

driver.findElement(selenium.By.id('data'))
  .then(e => e.getAttribute("value"))
  .then(s => stdout.write(s))
  .then(_ => driver.quit())
  .catch(exn => {
    stdout.write(`Got an exception from Selenium: ${exn}`);
    driver.quit();
  });
