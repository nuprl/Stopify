import { JavaScriptClientInterface } from './compiler';

export const JavaScript : JavaScriptClientInterface = {
  aceMode: 'javascript',
  defaultCode:
  `
function sum(n) {
  let sum = 0;
  for(let i = 0; i <= n; i++) {
    console.log('acc: ' + sum)
    sum += i
  }
  return sum;
}

sum(1000000)
  `,
  compileUrl: './compile/js'
}
