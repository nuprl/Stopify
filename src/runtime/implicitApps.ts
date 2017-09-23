type Prim = number | string | boolean | null | undefined;

function toPrimitive(x: any): Prim {
 // TODO(arjun): This isn't exactly the right order.
  if (typeof x === 'object' && x !== 'null') {
    let v = x.valueOf();
    if (typeof v === 'object' && v !== 'null') {
      v = x.toString();
      if (typeof v === 'object' && v !== 'null') {
        return undefined;
      }
      return v;
    }
    return v;
  }
  return x;
}

export function add(x: any, y: any) {
  return <any>toPrimitive(x) + <any>toPrimitive(y);
}

export function mul(x: any, y: any) {
  return <any>toPrimitive(x) * <any>toPrimitive(y);
}

export function sub(x: any, y: any) {
  return <any>toPrimitive(x) * <any>toPrimitive(y);
}

export function div(x: any, y: any) {
  return <any>toPrimitive(x) * <any>toPrimitive(y);
}