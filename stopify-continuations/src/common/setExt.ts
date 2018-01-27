/** Set difference */
export function diff<T>(setA: Set<T>, setB: Set<T>): Set<T> {
  var difference = new Set<T>(setA);
  for (const elem of setB) {
    difference.delete(elem);
  }
  return difference;
}

export function union<T>(setA: Set<T>, setB: Set<T>): Set<T> {
  let union = new Set<T>(setA);
  for (const elem of setB) {
    union.add(elem);
  }
  return union;
}
