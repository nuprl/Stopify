import { spawnSync } from 'child_process';
import { parse } from './datalogParser';
import * as d from './datalogSyntax';

import * as fs from 'fs'

const tmp = require('tmp')

export { datalogEval }

function datalogEval(setupString: string, queries: d.Assertion[]): d.Fact[] {
  const dataFile = tmp.fileSync('/tmp/')
  const outFile = tmp.fileSync('/tmp/')
  const data = setupString + '\n' + queries.join('\n')
  fs.writeFileSync(dataFile.name, data)
  spawnSync('datalog', ['-o', outFile.name, dataFile.name])
  const output = fs.readFileSync(outFile.name).toString();
  return parse(output)
}
