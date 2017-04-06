/* plugins: [anf,addKArg,cpsVisitor] */
function g() {
    let x = 1;
    return x;
    throw 'dead code';
}

function f() {
    let c = 1;
    let a = g();
    let b = 2;
    return a + b;
}
let x = f();
console.log(x+1);
