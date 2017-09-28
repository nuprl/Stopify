import { NodePath, Visitor } from 'babel-traverse';
import { SourceMapConsumer } from 'source-map';
import * as t from 'babel-types';
import {LineMapping} from '../common/helpers';

interface Options {
  sourceMap: LineMapping;
}

const opts = t.identifier("$opts");
const result = t.identifier("$result");

const insertSuspend: Visitor = {
  BlockStatement: {
    exit(path: NodePath<t.BlockStatement>, s: { opts: Options }): void {
      const { body } = path.node;
      const newBody: t.Statement[] = [];
      body.forEach((v, i) => {
        const loc = v.loc;
        let mark;
        let ln: number | null;
        if (loc) {
          ln = s.opts.sourceMap.getLine(loc.start.line, loc.start.column);
          if (ln) {
            newBody.push(
              t.expressionStatement(t.assignmentExpression('=',
                t.memberExpression(t.identifier('$__R'), t.identifier('linenum')),
                t.numericLiteral(ln))),
              t.expressionStatement(
                t.callExpression(t.memberExpression(t.identifier("$__R"),
                  t.identifier("suspend")), [])),
              v);
          } else {
            newBody.push(v);
          }
        } else {
          newBody.push(v);
        }
      });
      path.node.body = newBody;
    }
  },

  IfStatement(path: NodePath<t.IfStatement>): void {
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

  Loop(path: NodePath<t.Loop>): void {
    if (path.node.body.type !== "BlockStatement") {
      const body = t.blockStatement([path.node.body]);
      path.node.body = body;
    }
  },

  Program: {
    exit(path: NodePath<t.Program>, { opts }): void {
      if(opts.compileFunction) {
        if(path.node.body[0].type === 'FunctionDeclaration') {
          (<any>path.node.body[0]).topFunction = true
        }
        else {
          throw new Error(
            `Compile function expected top-level functionDeclaration`)
        }
      }
    }
  },
}

export default function () {
  return { visitor: insertSuspend};
}
