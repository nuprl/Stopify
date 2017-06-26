function Cat() {
  console.log('cat')
}

Cat.prototype.noise = function () {
  console.log('meow')
}

new Cat().noise()
