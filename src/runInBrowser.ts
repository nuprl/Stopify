import * as selenium from 'selenium-webdriver';
import * as path from 'path';
import * as runtime from './runtime/default';

const args = process.argv.slice(2);
const opts = runtime.parseRuntimeOpts(args);

function suffixAfter(str: string, key: string) {
  return str.slice(str.indexOf(' ')! + 1);
}


const src = 'file://' + path.resolve('.', opts.filename) + 
  '#' + encodeURIComponent(JSON.stringify(args));

const loggingPrefs = new selenium.logging.Preferences();
loggingPrefs.setLevel('browser', 'all');
const driver = new selenium.Builder()
  .forBrowser('chrome')
  .setLoggingPrefs(loggingPrefs)
  .build();

driver.get(src);
driver.wait(selenium.until.titleIs('done'), 60 * 1000);
driver.manage().logs().get('browser').then(logs => {
  logs.forEach(entry => {
    // Selenium prints the filename and line number
    const quoted = suffixAfter(suffixAfter(entry.message, ' '), ' ');
    console.log(quoted.slice(1, quoted.length - 1));
  });
  driver.quit();
});