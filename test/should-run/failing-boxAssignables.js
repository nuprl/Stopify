const Grammar = {
  constructAllParses: function() {
    for (;;) {
      const thiz = this;
      ret = ret.concat(
        function (kids) {
          return thiz.applyAction(rule, kids, sppfNode.pos, semActions);
        });
    }
  }
}
