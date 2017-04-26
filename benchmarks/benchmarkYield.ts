import * as bf from './benchmarkFixture';
import { yieldStopify } from '../src/stopifyYield'
import * as fs from 'fs';

bf.benchmarkFiles.forEach(function (file) {
  console.log(file)
  const code = fs.readFileSync(file, 'utf-8').toString();
  const trails = 5;
  for(let i = 1; i < 4; i++) {
    console.log(bf.benchmarkResponsiveness(yieldStopify, code, i*10, trails))
  }
})
