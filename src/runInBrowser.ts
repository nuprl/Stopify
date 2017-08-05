// NOTE(arjun): If this script doesn't work, you probably don't have Xvfb.
// The script should probably just skip starting Xvfb on Mac OS X.

import * as selenium from 'selenium-webdriver';
import * as path from 'path';
import * as runtime from './runtime/default';
const xvfb = require('xvfb'); // No type definitions as of 8/2/2017

const stdout = process.stdout;
const args = process.argv.slice(2);
const opts = runtime.parseRuntimeOpts(args);

function suffixAfter(str: string, key: string) {
  return str.slice(str.indexOf(' ')! + 1);
}

const src = 'file://' + path.resolve('.', opts.filename) + 
  '#' + encodeURIComponent(JSON.stringify(args));

const vfb = new xvfb();
vfb.startSync();

const loggingPrefs = new selenium.logging.Preferences();
loggingPrefs.setLevel('browser', 'all');
const driver = new selenium.Builder()
  .forBrowser('chrome')
  .setLoggingPrefs(loggingPrefs)
  .build();

driver.get(src);
driver.wait(selenium.until.titleIs('done'), 5 * 60 * 1000);
driver.manage().logs().get('browser').then(logs => {
  logs.forEach(entry => {
    // Selenium prints the filename and line number
    const quoted = suffixAfter(suffixAfter(entry.message, ' '), ' ');
    stdout.write(quoted.slice(1, quoted.length - 1) + '\n');
  });

  driver.quit();
  vfb.stopSync();
});