import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import {flatBodyStatement, letExpression, ReturnStatement} from './helpers';

type binop = "+" | "-" | "/" | "%" | "*" | "**" | "&" | "|" | ">>" | ">>>" |
  "<<" | "^" | "==" | "===" | "!=" | "!==" | "in" | "instanceof" | ">" |
  "<" | ">=" | "<=";
type unop = "-" | "+" | "!" | "~" | "typeof" | "void" | "delete";

type AExpr = t.Identifier | t.Literal;

interface BExpr { type: string }
interface CExpr { type: string }

interface BFun extends BExpr {
    type: "BFun";
    id: t.Identifier | undefined;
    args: t.Identifier[];
    body: C;
}

function bfun(id: t.Identifier | undefined, args: t.Identifier[], body: C): BFun {
    return { type: "BFun", id, args, body };
}

interface BAtom extends BExpr {
    type: "atom";
    atom: AExpr
}

function atom(atom: AExpr): BAtom {
  return { type: 'atom', atom };
}

interface BOp2 extends BExpr {
    type: "op2";
    name: binop;
    l: AExpr;
    r: AExpr
}

function bop2(name: binop, l: AExpr, r: AExpr): BOp2 {
  return { type: 'op2', name, l, r };
}

interface BOp1 extends BExpr {
    type: "op1";
    name: unop;
    v: AExpr;
}

function bop1(name: unop, v: AExpr): BOp1 {
  return { type: 'op1', name, v };
}

interface BAssign extends BExpr {
  type: "assign";
  operator: string;
  x: t.LVal;
  v: AExpr;
}

function bassign(operator: string, x: t.LVal, v: AExpr): BAssign {
  return { type: 'assign', operator, x, v };
}

interface BObj extends BExpr {
    type: "obj";
    fields: Map<string, AExpr>
}

interface BArrayLit extends BExpr {
    type: "arraylit";
    arrayItems: AExpr[];
}

interface BGet extends BExpr {
    type: "get";
    object: AExpr;
    property: AExpr;
}

function member(object: AExpr, property: AExpr): BGet {
  return { type: 'get', object, property };
}

interface BIncrDecr extends BExpr {
  type: 'incr/decr';
  operator: '++' | '--';
  argument: AExpr;
  prefix: boolean;
}

function incrDecr(operator: '++' | '--', argument: AExpr, prefix: boolean): BIncrDecr {
  return { type: 'incr/decr', operator, argument, prefix };
}

interface BUpdate extends BExpr {
    type: "update";
    obj: AExpr;
    key: AExpr;
    e: AExpr; 
}

type B = BFun | BAtom | BOp2 | BOp1 | BAssign | BObj | BArrayLit | BGet | BIncrDecr | BUpdate

interface CApp extends CExpr {
    type: "app";
    f: AExpr;
    args: AExpr[]
}

function capp(f: AExpr, args: AExpr[]): CApp {
    return { type: "app", f, args };
}

interface ITE extends CExpr {
    type: "ITE";
    e1: AExpr;
    e2: C;
    e3: C;
}

function ite(e1: AExpr, e2: C, e3: C): ITE {
  return { type: "ITE", e1, e2, e3 };
}

type kind = 'const' | 'var' | 'let' | undefined;
// This is really letrec
interface CLet extends CExpr {
  type: "let";
  kind: kind;    
  x: t.LVal;
  named: B;
  body: C;
}

type C = CLet | ITE | CApp;

function clet(kind: kind, x: t.LVal, named: B, body: C): CLet {
    return { type: "let", kind, x, named, body };
}

function cpsExprList(exprs: t.Expression[],
    k: (args: AExpr[]) => C,
    ek: (arg: AExpr) => C,
    path: NodePath<t.Node>): C {
    if (exprs.length === 0) {
        return k([]);
    }
    else {
        const [ hd, ...tl ] = exprs;
        return cpsExpr(hd,
            (v: AExpr) => cpsExprList(tl,
                (vs: AExpr[]) => k([v, ...vs]),
                ek,
                path), ek, path);
    }
}

const undefExpr: AExpr = t.identifier("undefined");

function cpsExpr(expr: t.Expression,
    k: (arg: AExpr) => C,
    ek: (arg: AExpr) => C,
    path: NodePath<t.Node>): C {
  switch (expr.type) {
    case 'Identifier':
      return k(expr);
    case 'BooleanLiteral':
    case 'NumericLiteral':
    case 'StringLiteral':
    case 'NullLiteral':
    case 'RegExpLiteral':
    case 'TemplateLiteral':
      return k(expr);
    case "AssignmentExpression":
      return cpsExpr(expr.right, r => {
        const assign = path.scope.generateUidIdentifier('assign');
        return clet('const', assign, bassign(expr.operator, expr.left, r), k(r));
      }, ek, path);
    case 'BinaryExpression':
      return cpsExpr(expr.left, l =>
        cpsExpr(expr.right, r => {
          let bop = path.scope.generateUidIdentifier('bop');
          return clet('const', bop, bop2(expr.operator, l, r), k(bop));
        }, ek, path), ek, path);
    case 'UnaryExpression':
      return cpsExpr(expr.argument, v => {
        let unop = path.scope.generateUidIdentifier('unop');
        return clet('const', unop, bop1(expr.operator, v), k(unop));
      }, ek, path);
    case "FunctionExpression":
      let func = path.scope.generateUidIdentifier('func');
      return clet('const', func, bfun(expr.id, <t.Identifier[]>(expr.params),
        cpsStmt(expr.body,
            r => capp(<t.Identifier>(expr.params[0]), [undefExpr]),
            r => capp(<t.Identifier>(expr.params[1]), [undefExpr]),
            path)), k(func));
    case "CallExpression":
      return cpsExpr(expr.callee, f =>
        cpsExprList(<t.Expression[]>(expr.arguments), args => {
          const kFun = path.scope.generateUidIdentifier('kFun');
          const kErr = path.scope.generateUidIdentifier('kErr');
          const r = path.scope.generateUidIdentifier('r');
          return clet('const', kFun, bfun(undefined, [r], k(r)),
            clet('const', kErr, bfun(undefined, [r], ek(r)),
              capp(f, [kFun, kErr, ...args])));
        }, ek, path), ek, path);
    case 'MemberExpression':
      return cpsExpr(expr.object, o =>
        cpsExpr(expr.property, p => {
          const obj = path.scope.generateUidIdentifier('obj');
          return clet('const', obj, member(o, p), k(obj));
        }, ek, path), ek, path);
    case 'UpdateExpression':
      return cpsExpr(expr.argument, (v: AExpr) => {
        const tmp = path.scope.generateUidIdentifier('update');
        return clet('const', tmp, incrDecr(expr.operator, v, expr.prefix), k(tmp));
      }, ek, path);
  }
  throw new Error(`${expr.type} not yet implemented`);
}

function cpsStmt(stmt: t.Statement,
    k: (arg: AExpr) => C,
    ek: (arg: AExpr) => C,
    path: NodePath<t.Node>): C {
  switch (stmt.type) {
    case "BlockStatement": {
      let [head, ...tail] = stmt.body;
      if (head === undefined) {
        return k(undefExpr);
      } else if (tail === []) {
        return cpsStmt(head, k, ek, path);
      } else {
        return cpsStmt(head, v => cpsStmt(t.blockStatement(tail),
            k, ek, path), ek, path);
      }
    }
    case "BreakStatement":
      return cpsExpr(stmt.label, label => capp(label, [undefExpr]), ek, path);
    case "EmptyStatement":
        return k(undefExpr);
    case "ExpressionStatement":
        return cpsExpr(stmt.expression, _ => k(undefExpr), ek, path);
    case "IfStatement":
      return cpsExpr(stmt.test, tst => ite(tst,
        cpsStmt(stmt.consequent, k, ek, path),
        cpsStmt(stmt.alternate, k, ek, path)), ek, path);
    case "LabeledStatement":
      const kErr = path.scope.generateUidIdentifier('kErr');
      return cpsExpr(t.callExpression(t.functionExpression(undefined,
          [stmt.label, kErr], flatBodyStatement([stmt.body])), []),
        k, ek, path);
    case "ReturnStatement":
        let returnK = (r: AExpr) =>
              capp(<t.Identifier>(<ReturnStatement>stmt).kArg, [r]);
        return cpsExpr(stmt.argument, r => returnK(r), ek, path);
    case 'ThrowStatement':
      return cpsExpr(stmt.argument, ek, v => capp(v, [undefExpr]), path);
    case 'TryStatement':
      return cpsStmt(stmt.block, k, v =>
        cpsExpr(t.functionExpression(undefined,
          [stmt.handler.param],
          stmt.handler.body), f => capp(f, [v]), ek, path), path);
    case "VariableDeclaration": {
      const { declarations } = stmt;
      const [head, ...tail] = declarations;
      if (head === undefined) {
        return k(undefExpr);
      } else if (tail === []) {
        return cpsExpr(head.init, v =>
          clet(stmt.kind, <t.Identifier>head.id, atom(v), k(undefExpr)), ek, path);
      } else {
        return cpsExpr(head.init, v =>
          clet(stmt.kind, <t.Identifier>head.id, atom(v),
            cpsStmt(t.variableDeclaration(stmt.kind, tail), k, ek, path)), ek, path);
      }
    }
    default:
      throw new Error(`${stmt.type} not yet implemented`);
    }
}

function generateBExpr(bexpr: B): t.Expression {
  switch (bexpr.type) {
    case 'BFun':
      return t.functionExpression(bexpr.id, bexpr.args, flatBodyStatement(generateJS(bexpr.body)));
    case 'atom':
      return bexpr.atom;
    case 'op2':
      return t.binaryExpression(bexpr.name, bexpr.l, bexpr.r);
    case 'op1':
      return t.unaryExpression(bexpr.name, bexpr.v);
    case 'assign':
      return t.assignmentExpression(bexpr.operator, bexpr.x, bexpr.v);
    case 'obj':
      const properties : t.ObjectProperty[] = [];
      bexpr.fields.forEach((value, key) =>
        properties.push(t.objectProperty(t.identifier(key), value)));
      return t.objectExpression(properties);
    case 'get':
      return t.memberExpression(bexpr.object, bexpr.property);
    case 'incr/decr':
      return t.updateExpression(bexpr.operator, bexpr.argument, bexpr.prefix);
    case 'arraylit':
    case 'update':
      throw new Error(`${bexpr.type} generation is not yet implemented`);
  }
}

function generateJS(cexpr: C): t.Statement[] {
  switch (cexpr.type) {
    case 'app':
      return [t.returnStatement(t.callExpression(cexpr.f, cexpr.args))];
    case 'ITE':
      return [t.ifStatement(cexpr.e1,
        flatBodyStatement(generateJS(cexpr.e2)),
        flatBodyStatement(generateJS(cexpr.e3)))];
    case 'let':
      const decl = letExpression(cexpr.x, generateBExpr(cexpr.named), cexpr.kind);
      return [decl, ...generateJS(cexpr.body)];
  }
}

const cpsExpression : Visitor = {
  Program: function (path: NodePath<t.Program>): void {
    const { body } = path.node;
    const cexpr = cpsStmt(t.blockStatement(body),
        v => capp(t.identifier('onDone'), [v]),
        v => capp(t.identifier('onError'), [v]), path);
    path.node.body = generateJS(cexpr);
  }
};

module.exports = function() {
  return { visitor: cpsExpression };
};
