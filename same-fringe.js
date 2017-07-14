
const _runtime = require("./runtime.js");

function node(left, right) {
  return { left: left, right: right, type: "node" };
}

function leaf(val) {
  return { type: "leaf", val: val };
}

function treeLeafGen(tree) {

  let caller = "nothing yet";
  let resume = function() {
    console.log("Here 4");
    returnLeaf(tree);
    return caller("done");
  }

  let returnLeaf = function(tree) {
    if (tree.type === "leaf") {
      console.log("At leaf", tree.val);
      _runtime.callCC(function(remainingLeaves) {
        console.log("Captured");
        resume = function() { remainingLeaves(void 0); }
        caller(tree.val);
      });
    }
    else {
      console.log("At node", tree);
      returnLeaf(tree.left);
      returnLeaf(tree.right);
    }
  }

  return function() {
    console.log("Here 0");
    _runtime.callCC(function(k) {
      console.log("Here 1");

      caller = k;
      resume();
    });
  };
}

let tree1 = node(leaf(1), leaf(2));
let gen = treeLeafGen(tree1);
console.log("Here") ;
console.log(gen());
console.log("Here 3");
console.log(gen());

/*
(define tree1 (node (leaf 1) 
                    (node (leaf 2) (node (node (leaf 3) (leaf 4)) (leaf 5)))))

(define tree2 (node (node (leaf 1) (node (leaf 2) (leaf 3))) 
                    (node (leaf 4) (leaf 5))))

(define (same-fringe? left-tree right-tree)
  (local ([define left-leaf-stream (tree->leaf-generator left-tree)]
          [define right-leaf-stream (tree->leaf-generator right-tree)]
          [define (loop)
            (local ([define left-leaf (left-leaf-stream)]
                    [define right-leaf (right-leaf-stream)])
              (cond
                [(and (equal? left-leaf 'done) (equal? right-leaf 'done)) true]
                [(equal? left-leaf right-leaf) (loop)]
                [else false]))])
    (loop)))

(test
 (same-fringe? tree1 tree2)
 true)

(test
 (same-fringe? (node (leaf 1) (node (leaf 2) (leaf 3))) 
               (node (leaf 1) (node (leaf 3) (leaf 2))))
 false)
*/
