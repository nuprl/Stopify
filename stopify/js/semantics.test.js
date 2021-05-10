require("../dist/stopify-full.bundle.js");
  
test('top-level var in a while loop', (done) => {
    var runner = window.stopify.stopifyLocally(`
        var i = 0;
        while(i < 1) {
            var G = i + 1;
            i = G;
        }
    `);
    expect(runner.kind).toBe('ok');
    runner.run((result) => {
        expect(result.type).toBe('normal');
        expect(runner.g.i).toBe(1);
        done();
    });
});

test.skip('top-level let in a while loop', (done) => {
    var runner = window.stopify.stopifyLocally(`
        var i = 0;
        while(i < 1) {
            let G = i + 1;
            i = G;
        }
    `);
    expect(runner.kind).toBe('ok');
    runner.run((result) => {
        expect(result.type).toBe('normal');
        expect(runner.g.i).toBe(1);
        // NOTE(arjun): Without more work, this assertion will fail.
        expect(runner.g.G).toBe(undefined);
        done();
    });
});