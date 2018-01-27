export function get_prop(obj: any, prop: any) {
  const v = obj[prop]
  if (typeof v === 'function') {
    return v.bind(obj)
  }
  else {
    return v
  }
}

export function set_prop(obj: any, prop: any, value: any) {
  return obj[prop] = value
}
