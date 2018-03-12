// Do not directly use this file. We stopify and webpack this file for each
// type of transformation.

export function get_prop(obj: any, prop: any) {
  const v = obj[prop];
  if (typeof v === 'function') {
    const func = v.bind(obj);
    func.prototype = v.prototype;
    return func;
  }
  else {
    return v;
  }
}

export function set_prop(obj: any, prop: any, value: any) {
  return obj[prop] = value;
}

export function delete_prop(obj: any, prop: any) {
  delete obj[prop];
}
