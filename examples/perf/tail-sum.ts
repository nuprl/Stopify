const n = 30000;

function sum(i: number, acc: number): number {
  if (i === 0) {
    return acc;
  } else {
    return sum(i-1, acc+i);
  }
}

console.log('Starting loop...');
let i = 0;
const begin = Date.now();
while (i++ < n) {
  sum(i, 0);
}
const done = (Date.now() - begin) / 1000;
console.log('Loop:\t' + done + 's');
