import * as f from './testFixtures'

describe('deep-stacks', function () {
  f.deepTests.forEach((filename: string) => {
    f.callCCTest(filename, "lazyDeep", "-d 1000")
  })
})
