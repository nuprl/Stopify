import { Visitor } from '@babel/traverse';
import * as t from '@babel/types';
import { CompilerOpts } from 'stopify-continuations-compiler';

function insertSuspendHelper(body: t.Statement[], opts: CompilerOpts) {
  const newBody: t.Statement[] = [];
  (<any>newBody).suspends = false;
  body.forEach((v, i) => {
    const loc = v.loc;
    let ln: number | null;
    if (loc) {
      ln = opts.sourceMap.getLine(loc.start.line, loc.start.column);
      if (ln) {
        newBody.push(
          t.expressionStatement(t.assignmentExpression('=',
            t.memberExpression(t.memberExpression(t.identifier('$S'), t.identifier('suspendRTS')), t.identifier('linenum')),
            t.numericLiteral(ln))),
          t.expressionStatement(
            t.callExpression(t.memberExpression(t.identifier("$S"),
              t.identifier("suspend")), [])),
          v);
        (<any>newBody).suspends = true;
      } else {
        newBody.push(v);
      }
    } else {
      newBody.push(v);
    }
  });
  return newBody;
}
export const visitor: Visitor<{ opts: CompilerOpts }> = {
  BlockStatement: {
    exit(path, state) {
      path.node.body = insertSuspendHelper(path.node.body, state.opts);
    }
  },

  IfStatement(path) {
    if (path.node.consequent.type !== "BlockStatement") {
      const block = t.blockStatement([path.node.consequent]);
      path.node.consequent = block;
    }
    if (path.node.alternate &&
      path.node.alternate.type !== "BlockStatement") {
      const block = t.blockStatement([path.node.alternate]);
      path.node.alternate = block;
    }
  },

  Loop: {
    enter(path) {
      if (path.node.body.type !== "BlockStatement") {
        const body = t.blockStatement([path.node.body]);
        path.node.body = body;
      }
    },

    exit(path) {
      if (t.isBlockStatement(path.node.body) &&
        !(<any>path.node.body).suspends) {
        path.node.body.body.push(t.expressionStatement(
          t.callExpression(t.memberExpression(t.identifier("$S"),
            t.identifier("suspend")), [])));
      }
    }
  },

  Program: {
    exit(path, { opts }) {
      if(opts.compileFunction) {
        if(path.node.body[0].type === 'FunctionDeclaration') {
          (<any>path.node.body[0]).topFunction = true;
        }
        else {
          throw new Error(
            `Compile function expected top-level functionDeclaration`);
        }
      }
      path.node.body = insertSuspendHelper(path.node.body, opts);
    }
  },
};
