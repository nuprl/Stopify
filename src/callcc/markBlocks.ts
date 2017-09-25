import * as t from "babel-types";
import { NodePath } from "babel-traverse";

// We would've needed to check that each of the argument is also a value,
// but ANF guarantees that all of the args are named.
function isTailCall(arg: t.Expression) {
  return (t.isCallExpression(arg) || t.isNewExpression(arg))
}

const functionMarkingVisitor = function(path: NodePath<t.FunctionExpression|t.FunctionDeclaration>) {
  (<any>path.node).nomerge = true;
  let parent: NodePath<t.Node> = path.findParent(t.isStatement)
  while (parent && !t.isFunction(parent)) {
    (<any>parent.node).nomerge = true
    parent = parent.findParent(t.isStatement)
  }
}

const markingVisitor = {
  FunctionExpression: functionMarkingVisitor,
  FunctionDeclaration: functionMarkingVisitor,
  ReturnStatement(path: NodePath<t.ReturnStatement>) {
    const arg = path.node.argument;
    // If the argument of return is a tail call, then mark every statement 
    // parent containing this upto the function as 'un-flattenable' (i.e.
    // try blocks around it can't be merged.)
    if (isTailCall(arg)) {
      let parent: NodePath<t.Node> = path
      while(parent && !t.isFunction(parent)) {
        (<any>parent.node).nomerge = true
        parent = parent.findParent(t.isStatement)
      }
    }
  }
}

const visitor = {
  BlockStatement: {
    /**
     * This generates blocks around groups of mergeable children. These 
     * blocks can simply be plopped in as the block for the try in jumper for
     * the lazy transform.
     */
    enter(path: NodePath<t.BlockStatement>) {
      if((<any>path.node).merge && !t.isFunction(path.parent)) {
        path.skip()
        return
      }
      path.traverse(markingVisitor)

      const { body } = path.node
      const afterDecls = body.findIndex(e =>
        !(<any>e).__boxVarsInit__ && !(<any>e).lifted);

      const groups: t.Statement[][] = [[]];

      for (let i = afterDecls; i < body.length; i++) {
        if((<any>body[i]).nomerge) {
          groups.push([body[i]])
          groups.push([])
        }
        else {
          groups[groups.length - 1].push(body[i])
        }
      }

      // Stuff after hoisted vars
      const post = groups.filter(x => x.length !== 0).map(g => {
        if (g.length === 1 && (<any>g[0]).nomerge) {
          return g[0]
        }
        else {
          const block = t.blockStatement(g);
          (<any>block).merge = true;
          return block
        }
      });
      path.node.body = [...body.slice(0, afterDecls), ...post]
    }
  }
}

export default function () {
  return { visitor }
}