/**
 * Each integration test is a web page in the test-data/integration/ directory.
 * We use Selenium (with Chrome) to visit the page and wait for the title to be
 *  "okay" or "error".
 */
import * as selenium from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import * as glob from 'glob';
import * as path from 'path';

let driver: selenium.ThenableWebDriver = <any>undefined;

beforeAll(() => {
  // NOTE(sam): No typing for `headless()` option as of 8/30/2017.
  // I've opened a PR to DefinitelyTyped to fix this.
  // https://github.com/DefinitelyTyped/DefinitelyTyped/pull/19463
  const chromeOpts = (<any>new chrome.Options()).headless();

  const loggingPrefs = new selenium.logging.Preferences();
  loggingPrefs.setLevel('browser', 'all');

  let builder = new selenium.Builder()
    .forBrowser('chrome')
    .setLoggingPrefs(loggingPrefs)
    .setChromeOptions(chromeOpts);

  driver = builder.build();
});

for (const testPath of glob.sync('test-data/integration/*.html')) {
  test(testPath, async () => {
    expect.assertions(1);
    const url = `file://` + path.resolve(testPath);
    await driver.get(url);
    await driver.wait(selenium.until.titleMatches(/okay|error/), 10000);
    const title = await driver.getTitle();
    expect(title).toEqual('okay');
  });
}

afterAll(() => {
  driver.quit();
});
