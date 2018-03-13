/**
 * This Babel plugin transforms top-level statements to use '$__R.delimit'.
 */
import { NodePath } from 'babel-traverse';
import * as t from 'babel-types';
import * as assert from 'assert';
import * as fastFreshId from '../fastFreshId';
import * as imm from 'immutable';

const runtime = t.identifier('$__R');

/**
 * Transforms 'stmt' to '$__R.delimit(function delimitN(() { stmt })'
 */
function delimitStmt(stmt: t.Statement): t.Statement {
  const fun = t.functionExpression(fastFreshId.fresh('delimit'), [],
    t.blockStatement([stmt]));
  (<any>fun).localVars = [];
  (<any>fun).boxedArgs = imm.Set.of();

  return t.expressionStatement(t.callExpression(
    t.memberExpression(runtime, t.identifier('delimit')), [fun]));
}

const visitor = {
  Program(path: NodePath<t.Program>, state: any): void {
    const body = path.node.body;
    for (let i = 0; i < body.length; i++) {
      const stmt = body[i];
      if (stmt.type === 'VariableDeclaration') {
        // Assumes that the declVars transform ran before this one.
        stmt.declarations.map(decl =>
          assert(decl.init === null, 'Variable declarations should not have init'))
      }
      else if (stmt.type === 'FunctionDeclaration') {
        // leave intact
      }
      else {
        if (state.opts.compileFunction && (<any>body[i]).topFunction) {
        }
        else {
          body[i] = delimitStmt(body[i]);
        }
      }
    }
    path.stop();
  }
};

export default function() {
  return { visitor };
}
