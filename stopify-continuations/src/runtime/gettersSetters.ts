export function get_prop(obj: any, prop: any) {
  const v = obj[prop]
  if (typeof v === 'function') {
    return v.bind(obj)
  }
  else {
    return v
  }
}
