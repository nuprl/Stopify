/** Set difference */
export function diff<T>(setA: Set<T>, setB: Set<T>): Set<T> {
  var difference = new Set<T>(setA);
  for (const elem of setB) {
    difference.delete(elem);
  }
  return difference;
}
