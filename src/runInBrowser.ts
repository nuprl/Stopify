// NOTE(arjun): If this script doesn't work, you probably don't have Xvfb.
import * as selenium from 'selenium-webdriver';
import * as path from 'path';
import * as runtime from './runtime/default';
import * as os from 'os';
const xvfb = require('xvfb'); // No type definitions as of 8/2/2017

const stdout = process.stdout;
const args = process.argv.slice(2);
const opts = runtime.parseRuntimeOpts(args);

function suffixAfter(str: string, key: string) {
  return str.slice(str.indexOf(' ')! + 1);
}

const src = 'file://' + path.resolve('.', opts.filename) +
  '#' + encodeURIComponent(JSON.stringify(args));


let vfb: any;

if (os.platform() === 'linux') {
  vfb = new xvfb({ reuse: true });
  vfb.startSync();
}

const loggingPrefs = new selenium.logging.Preferences();
loggingPrefs.setLevel('browser', 'all');
const driver = new selenium.Builder()
  .forBrowser(opts.env)
  .setLoggingPrefs(loggingPrefs)
  .build();

driver.get(src);
driver.wait(selenium.until.titleIs('done'), 5 * 60 * 1000);


function saveLog(logs: selenium.logging.Entry[])  {
  logs.forEach(entry => stdout.write(entry.message + '\n'));
}

const logger = driver.manage().logs();

logger.get('browser')
  .then(saveLog)
  .then(_ => logger.get('driver'))
  .then(saveLog)
  .then(_ =>  driver.findElement(selenium.By.id('data')))
  .then(e => e.getAttribute("value"))
  .then(s => stdout.write(s))
  .then(_ => driver.quit())
  .catch(exn => {
    stdout.write(`Got an exception from Selenium: ${exn}`);
    driver.quit();
  });
