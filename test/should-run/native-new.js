let map = new WeakMap()

map.set('a', 1)

assert.equals(map.get('a'), 1)
