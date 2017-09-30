/*
 The corresponding Scheme program (uses call/cc):

  (define saved #f)

  (define (f)
    (call/cc
    (lambda (k)
        (when (not saved)
          (set! saved k)
          (k 'first)))))

  (define (g)
    (define r (f))
    (case r
      [(first) (saved 'second)]
      [(second) (saved 'third)]
      ((third) 'done)
      [else (error "wtf")]))
  (equal? (g) 'done)
 */
let saved = false;
let i = 0;
function myFun() {
  return captureCC(function(k) {
    if (saved === false) {
      saved = k;
      return k("first");
    };
  });
}

function myGun() {  
  let r = myFun();
  i++;
  switch (r) {
    case "first": return saved("second");
    case "second": return saved("third");
    case "third": return "done";
    default: throw "Very bad";
  }
}
if (myGun() === "done" && i === 3) {
  process.exit(42);
}