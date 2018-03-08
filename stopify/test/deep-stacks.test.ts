import * as f from './testFixtures'
import { callCCTest } from './testFixtures';

describe('deep-stacks', function () {
  f.deepTests.forEach((filename: string) => {
    callCCTest(filename, "-t lazy", "--stack-size 1000 --restoreFrames 1");
  })
})
