import * as t from "babel-types";
import { NodePath } from "babel-traverse";
import { FlatnessMark } from "../common/helpers"

// undefined stands for mergeable blocks.
type MergeMarks = 'tail' | undefined
type MergeMarkable<T> = T & { mergemark: MergeMarks }

function isTailCall(arg: t.Expression) {
  return (t.isCallExpression(arg) || t.isNewExpression(arg))
}

function genBlocks(path: NodePath<FlatnessMark<t.FunctionDeclaration|t.FunctionExpression>>) {
  if (path.node.mark === 'Flat') {
    return
  }
  let body: t.Statement[] = path.node.body.body

  // TODO(rachit): We are doing this calculation twice now. Let's make it a property
  const afterDecls = Math.max(body.findIndex(e =>
    !(<any>e).__boxVarsInit__ && !(<any>e).lifted), 0);

  const groups: t.Statement[][] = [[]];

  for (let i = afterDecls; i < body.length; i++) {
    if ((<MergeMarkable<t.Statement>>body[i]).mergemark === 'tail') {
      groups.push([body[i]])
      groups.push([])
    }
    else {
      groups[groups.length - 1].push(body[i])
    }
  }

  // Stuff after hoisted vars
  const post = groups.filter(x => x.length !== 0).map(g => {
    if (g.length === 1 && (<MergeMarkable<t.Statement>>g[0]).mergemark == 'tail') {
      return g[0]
    }
    else {
      const block = t.blockStatement(g);
      (<any>block).merge = true;
      return block
    }
  });
  path.node.body.body = [...body.slice(0, afterDecls), ...post]
  path.skip()
}

const bodyVisitor = {
  ReturnStatement(path: NodePath<MergeMarkable<t.ReturnStatement>>) {
    // If the argument of return is a tail call, then mark every statement
    // parent containing this return statement upto the function as
    // 'un-flattenable' (i.e. try blocks around it can't be merged.)
    if (isTailCall(path.node.argument)) {
      let parent: NodePath<MergeMarkable<t.Node>> = path
      while (parent && !t.isFunction(parent)) {
        parent.node.mergemark = 'tail';
        parent = <NodePath<MergeMarkable<t.Node>>>parent.findParent(p => t.isStatement(p) || t.isFunction(p))
      }
    }
  },
}

const visitor = {
  Program(path: NodePath<t.Program>) {
    path.traverse(bodyVisitor)
  },
  FunctionDeclaration: {
    exit: genBlocks
  },
  FunctionExpression: {
    exit: genBlocks
  },
  BlockStatement: {
    /**
     * This generates blocks around groups of mergeable children. These 
     * blocks can simply be plopped in as the block for the try in jumper for
     * the lazy transform.
     */
    exit(path: NodePath<MergeMarkable<t.BlockStatement>>) {
      /**
       * This block shouldn't be transformed in two cases:
       * 1. If the block isn't marked as containing a 'tail' mark and the
       *    statement parent around it doesn't contain a tail mark either (this is
       *    for 'if statements where the consequent and the alternate can affect
       *    each other's mergeablility).
       * 2. If the parent is a function. This is because functions _have_ to
       * run this transform. Skipping here avoid doing the same wrapping twice.
       */
      if (path.node.mergemark !== 'tail' && (<any>path.getStatementParent().node).mergemark !== 'tail' || t.isFunction(path.parent)) {
        return
      }
      const { body } = path.node
      const groups: t.Statement[][] = [[]];

      for (let i = 0; i < body.length; i++) {
        if ((<MergeMarkable<t.Statement>>body[i]).mergemark === 'tail') {
          groups.push([body[i]])
          groups.push([])
        }
        else {
          groups[groups.length - 1].push(body[i])
        }
      }

      const post = groups.filter(x => x.length !== 0).map(g => {
        if (g.length === 1 && (<any>g[0]).mergemark === 'tail') {
          return g[0]
        }
        else {
          const block = t.blockStatement(g);
          (<any>block).merge = true;
          return block
        }
      });

      path.node.body = post
    }
  }
}

export default function () {
  return { visitor }
}