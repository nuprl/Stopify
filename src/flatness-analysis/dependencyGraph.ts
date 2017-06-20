import { NodePath, VisitNode, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import * as g from 'graphlib'

/** Build a dependency graph for the given program. Each node corresponds
 * to a functionDecl while each directed edge A -> B means that function
 * 'A' calls 'B'.
 */
const graph = new g.Graph();

function toDot(edges: g.Edge[]): string {
  let retStr = `strict digraph G {\n`
  edges.forEach(e => {
    retStr += `  "${e.v}" -> "${e.w}";\n`
  })
  return retStr + "}";
}

function nodeToString(node: t.Expression): string | null {
  switch(node.type) {
    case 'Identifier': return node.name;
    default: return null;
  }
}

const callExpression: VisitNode<t.CallExpression> =
  function (path: NodePath<t.CallExpression>) {
    const name : string | null = nodeToString(path.node.callee);
    if (name !== null) {
      const par: NodePath<t.FunctionDeclaration> =
        <NodePath<t.FunctionDeclaration>>path.findParent(p =>
          t.isFunctionDeclaration(p))
      if(par !== null) {
        graph.setEdge(par.node.id.name, name)
      }
    }
  }

const program: VisitNode<t.Program> = {
  exit(path: NodePath<t.Program>) {
    console.log(toDot(graph.edges()))
  }
}

const visitor = {
  CallExpression: callExpression,
  Program: program,
}

module.exports = function () {
  return { visitor };
}
