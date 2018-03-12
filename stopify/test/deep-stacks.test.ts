import * as f from './testFixtures'
import { callCCTest } from './testFixtures';

describe('deep-stacks', function () {
  f.deepTests.forEach((filename: string) => {
    callCCTest(filename, "-t lazy", "--stack-size 1000 --restore-frames 1");
    callCCTest(filename, "-t retval", "--stack-size 1000 --restore-frames 1");
  })
})
