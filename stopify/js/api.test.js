require("../stopify/dist/stopify-full.bundle.js");
  
test('strict mode parse error from stopifyLocally', () => {
    // The use strict makes the Babylon parser crash.
    var runner = window.stopify.stopifyLocally(`"use strict"; function F(x,x) { }`);
    expect(runner.kind).toBe('error');
});

test('strict mode parse error from evalAsync', (done) => {
    // The use strict makes the Babylon parser crash.
    var runner = window.stopify.stopifyLocally(``);
    expect(runner.kind).toBe('ok');
    runner.evalAsync(`"use strict"; function F(x,x) { }`, (result) => {
        expect(result.type).toBe('exception');
        done();
    });
});