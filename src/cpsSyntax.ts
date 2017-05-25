import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import {administrative,
  call,
  apply,
  directApply,
  flatBodyStatement,
  letExpression,
  transformed,
  ReturnStatement} from './helpers';

type binop = "+" | "-" | "/" | "%" | "*" | "**" | "&" | "|" | ">>" | ">>>" |
  "<<" | "^" | "==" | "===" | "!=" | "!==" | "in" | "instanceof" | ">" |
  "<" | ">=" | "<=";

type unop = "-" | "+" | "!" | "~" | "typeof" | "void" | "delete";

type kind = 'const' | 'var' | 'let' | undefined;

const nullLoc : any  = {
  start: {
    line: null,
    column: null,
  },
  end: {
    line: null,
    column: null,
  },
};

function bind(obj: t.Expression, prop: t.Expression): t.ConditionalExpression {
  return t.conditionalExpression(t.memberExpression(obj, t.identifier('$isTransformed')),
    t.memberExpression(obj, prop),
    directApply(t.callExpression(t.memberExpression(t.memberExpression(obj, prop),
      t.identifier('bind')), [obj])));
}

class Node {
  start: number;
  end: number;
  loc: t.SourceLocation;

  constructor() {
    this.start = 0;
    this.end = 0;
    this.loc = nullLoc;
  }
}

type AExpr = t.Identifier | t.Literal;

class BFun extends Node {
  type: 'BFun';

  constructor(public id: t.Identifier | undefined,
    public args: t.Identifier[],
    public body: CExpr) {
    super();
    this.type = 'BFun';
  }
}

class BAdminFun extends Node {
  type: 'BAdminFun';

  constructor(public id: t.Identifier | undefined,
    public args: t.Identifier[],
    public body: CExpr) {
    super();
    this.type = 'BAdminFun';
  }
}

class BAtom extends Node {
  type: 'atom';

  constructor(public atom: AExpr | t.SpreadElement) {
    super();
    this.type = 'atom';
  }
}

class BOp2 extends Node {
  type: 'op2';

  constructor(public name: binop,
    public l: AExpr,
    public r: AExpr) {
    super();
    this.type = 'op2';
  }
}

class BOp1 extends Node {
  type: 'op1';

  constructor(public name: unop, public v: AExpr) {
    super();
    this.type = 'op1';
  }
}


class BAssign extends Node {
  type: 'assign';

  constructor(public operator: string, public x: t.LVal, public v: AExpr) {
    super();
    this.type = 'assign';
  }

}

// TODO(sbaxter): Object literals need to track whether property keys are
// computed for proper JS generation:
//
// const obj = {
//   ['foo' + 9000]: val,
// }
class BObj extends Node {
  type: 'obj';

  constructor(public fields: Map<AExpr, AExpr>) {
    super();
    this.type = 'obj';
  }
}

class BArrayLit extends Node {
  type: 'arraylit';

  constructor(public arrayItems: AExpr[]) {
    super();
    this.type = 'arraylit';
  }
}

class BGet extends Node {
  type: 'get';

  constructor(public object: AExpr,public  property: AExpr) {
    super();
    this.type = 'get';
  }
}


class BIncrDecr extends Node {
  type: 'incr/decr';

  constructor(public operator: '++' | '--',
    public argument: AExpr,
    public prefix: boolean) {
    super();
    this.type = 'incr/decr';
  }
}

class BUpdate extends Node {
  type: 'update';

  constructor(public obj: AExpr,
    public key: AExpr,
    public e: AExpr) {
    super();
    this.type = 'update';
  }
}

class BSeq extends Node {
  type: 'seq';

  constructor(public elements: AExpr[]) {
    super();
    this.type = 'seq';
  }
}

class BThis extends Node {
  type: 'this';

  constructor() {
    super();
    this.type = 'this';
  }
}

type BExpr =
  BFun | BAdminFun | BAtom | BOp2 | BOp1 | BAssign | BObj | BArrayLit | BGet | BIncrDecr
  | BUpdate | BSeq | BThis | t.NewExpression | t.ConditionalExpression

class CApp extends Node {
  type: 'app';

  constructor(public f: AExpr, public args: (AExpr | t.SpreadElement)[]) {
    super();
    this.type = 'app';
  }
}

class CCallApp extends Node {
  type: 'callapp';

  constructor(public f: t.Expression, public args: (AExpr | t.SpreadElement)[]) {
    super();
    this.type = 'callapp';
  }
}

class CApplyApp extends Node {
  type: 'applyapp';

  constructor(public f: t.Expression, public args: (AExpr | t.SpreadElement)[]) {
    super();
    this.type = 'applyapp';
  }
}

class CAdminApp extends Node {
  type: 'adminapp';

  constructor(public f: AExpr, public args: (AExpr | t.SpreadElement)[]) {
    super();
    this.type = 'adminapp';
  }
}

class ITE extends Node {
  type: 'ITE';

  constructor(public e1: AExpr,
    public e2: CExpr,
    public e3: CExpr) {
    super();
    this.type = 'ITE';
  }
}

// This is really letrec
class CLet extends Node {
  type: 'let';

  constructor(public kind: kind,
    public x: t.LVal,
    public named: BExpr,
    public body: CExpr) {
    super();
    this.type = 'let';
  }

}

type CExpr = CLet | ITE | CApp | CCallApp | CApplyApp | CAdminApp;

const undefExpr: AExpr = t.identifier("undefined");

function addLoc(obj: any,
  start: number,
  end: number,
  loc: t.SourceLocation): any {
    for (const prop in Object.keys(obj)) {
      if (obj[prop] !== undefined &&
        (obj[prop].loc === undefined || obj[prop].loc === nullLoc)) {
        obj[prop].start = start;
        obj[prop].end = end;
        obj[prop].loc = loc;
        if (typeof obj[prop] === 'object') {
          addLoc(obj[prop], start, end, loc);
        }
      }
    }
    obj.start = start;
    obj.end = end;
    obj.loc = loc;
    return obj;
  }

function cpsExprList(exprs: (t.Expression | t.SpreadElement)[],
  k: (args: (AExpr | t.SpreadElement)[]) => CExpr,
  ek: (arg: AExpr) => CExpr,
  path: NodePath<t.Node>): CExpr {
    if (exprs.length === 0) {
      return k([]);
    }
    else {
      const [ hd, ...tl ] = exprs;
      if (t.isExpression(hd)) {
        return cpsExpr(hd,
          (v: AExpr) => cpsExprList(tl,
            (vs: AExpr[]) => k([v, ...vs]),
            ek,
            path), ek, path);
      } else {
        return cpsExprList(tl,
          (vs: AExpr[]) => k([hd, ...vs]),
          ek,
          path);
      }
    }
  }

function cpsObjMembers(mems: t.ObjectMember[],
  k: (args: AExpr[][]) => CExpr,
  ek: (arg: AExpr) => CExpr,
  path: NodePath<t.Node>): CExpr {
    if (mems.length === 0) {
      return k([]);
    }
    else {
      const [ hd, ...tl ] = mems;
      return cpsExpr(hd.key,
        (id: AExpr) => cpsExpr(hd.value,
          (v: AExpr) => cpsObjMembers(tl,
            (vs: AExpr[][]) => k([[id,v], ...vs]),
            ek,
            path), ek, path), ek, path);
    }
  }

function cpsExpr(expr: t.Expression,
  k: (arg: AExpr) => CExpr,
  ek: (arg: AExpr) => CExpr,
  path: NodePath<t.Node>): CExpr {
    if (expr === null) {
      return k(t.nullLiteral());
    }
    switch (expr.type) {
      case 'Identifier':
        return k(expr);
      case 'BooleanLiteral':
      case 'NumericLiteral':
      case 'StringLiteral':
      case 'NullLiteral':
      case 'RegExpLiteral':
      case 'TemplateLiteral':
        return addLoc(k(expr), expr.start, expr.end, expr.loc);
      case 'ArrayExpression':
        return addLoc(cpsExprList(expr.elements, (args: AExpr[]) => {
          const arr = path.scope.generateUidIdentifier('arr');
          return new CLet('const', arr, new BArrayLit(args), k(arr));
        }, ek, path), expr.start, expr.end, expr.loc);
      case "AssignmentExpression":
        return addLoc(cpsExpr(expr.right, r => {
          const assign = path.scope.generateUidIdentifier('assign');
          return new CLet('const', assign,
            new BAssign(expr.operator, expr.left, r), k(r));
        }, ek, path), expr.start, expr.end, expr.loc);
      case 'BinaryExpression':
        return addLoc(cpsExpr(expr.left, l =>
          cpsExpr(expr.right, r => {
            let bop = path.scope.generateUidIdentifier('bop');
            return new CLet('const', bop, new BOp2(expr.operator, l, r), k(bop));
          }, ek, path), ek, path), expr.start, expr.end, expr.loc);
      case 'ConditionalExpression':
        return addLoc(cpsExpr(expr.test, tst => new ITE(tst,
          cpsExpr(expr.consequent, k, ek, path),
          cpsExpr(expr.alternate, k, ek, path)), ek, path),
          expr.start, expr.end, expr.loc);
      case 'UnaryExpression':
        return addLoc(cpsExpr(expr.argument, v => {
          let unop = path.scope.generateUidIdentifier('unop');
          return new CLet('const', unop, new BOp1(expr.operator, v), k(unop));
        }, ek, path), expr.start, expr.end, expr.loc);
      case "FunctionExpression":
        let func = path.scope.generateUidIdentifier('func');
        return addLoc(new CLet('const', func,
          new BFun(expr.id, <t.Identifier[]>(expr.params),
            cpsStmt(expr.body,
              r => new CAdminApp(<t.Identifier>(expr.params[0]), [r]),
              r => new CAdminApp(<t.Identifier>(expr.params[1]), [r]),
              path)), k(func)), expr.start, expr.end, expr.loc);
      case "CallExpression":
        const callee = expr.callee;
        if (t.isMemberExpression(callee) &&
          t.isIdentifier(callee.property) &&
          callee.property.name === 'call') {
          return addLoc(cpsExprList(expr.arguments, args => {
              const kFun = path.scope.generateUidIdentifier('kFun');
              const kErr = path.scope.generateUidIdentifier('kErr');
              const r = path.scope.generateUidIdentifier('r');
              return new CLet('const', kFun, new BAdminFun(undefined, [r], k(r)),
                new CLet('const', kErr, new BAdminFun(undefined, [r], ek(r)),
                  new CCallApp(callee.object, [kFun, kErr, ...args])));
            }, ek, path), expr.start, expr.end, expr.loc);
        } else if (t.isMemberExpression(callee) &&
          t.isIdentifier(callee.property) &&
          callee.property.name === 'apply') {
          return addLoc(cpsExprList(expr.arguments, args => {
              const kFun = path.scope.generateUidIdentifier('kFun');
              const kErr = path.scope.generateUidIdentifier('kErr');
              const r = path.scope.generateUidIdentifier('r');
              return new CLet('const', kFun, new BAdminFun(undefined, [r], k(r)),
                new CLet('const', kErr, new BAdminFun(undefined, [r], ek(r)),
                  new CApplyApp(callee.object, [kFun, kErr, ...args])));
            }, ek, path), expr.start, expr.end, expr.loc);
        } else if (t.isMemberExpression(callee) &&
          t.isIdentifier(callee.property)) {
          const bnd = path.scope.generateUidIdentifier('bind');
          return addLoc(new CLet('const', bnd, bind(callee.object, <t.Identifier>callee.property),
            cpsExprList(expr.arguments, args => {
              const kFun = path.scope.generateUidIdentifier('kFun');
              const kErr = path.scope.generateUidIdentifier('kErr');
              const r = path.scope.generateUidIdentifier('r');
              return new CLet('const', kFun, new BAdminFun(undefined, [r], k(r)),
                new CLet('const', kErr, new BAdminFun(undefined, [r], ek(r)),
                  new CApp(bnd, [kFun, kErr, ...args])));
            }, ek, path)), expr.start, expr.end, expr.loc);
        } else {
          return addLoc(cpsExpr(callee, f =>
            cpsExprList(expr.arguments, args => {
              const kFun = path.scope.generateUidIdentifier('kFun');
              const kErr = path.scope.generateUidIdentifier('kErr');
              const r = path.scope.generateUidIdentifier('r');
              return new CLet('const', kFun, new BAdminFun(undefined, [r], k(r)),
                new CLet('const', kErr, new BAdminFun(undefined, [r], ek(r)),
                  new CApp(f, [kFun, kErr, ...args])));
            }, ek, path), ek, path), expr.start, expr.end, expr.loc);
        }
      case 'MemberExpression':
        return addLoc(cpsExpr(expr.object, o =>
          cpsExpr(expr.property, p => {
            const obj = path.scope.generateUidIdentifier('obj');
            return new CLet('const', obj, new BGet(o, p), k(obj));
          }, ek, path), ek, path), expr.start, expr.end, expr.loc);
      case 'NewExpression':
        const tmp = path.scope.generateUidIdentifier('new');
        return addLoc(new CLet('const', tmp, expr, k(tmp)),
          expr.start, expr.end, expr.loc);
      case 'ObjectExpression':
        return addLoc(cpsObjMembers(<t.ObjectMember[]>expr.properties,
          (mems: AExpr[][]) => {
            const obj = path.scope.generateUidIdentifier('obj');
            const fields = new Map();
            mems.forEach(function (item) {
              const [id, v] = item;
              fields.set(id, v);
            });
            return new CLet('const', obj, new BObj(fields), k(obj));
          },
          ek,
          path), expr.start, expr.end, expr.loc);
      case 'SequenceExpression':
        return cpsExprList(expr.expressions, (vs: AExpr[]) => {
          const seq = path.scope.generateUidIdentifier('seq');
          return new CLet('const', seq, new BSeq(vs), k(seq));
        }, ek, path);
      case 'ThisExpression':
        const ths = path.scope.generateUidIdentifier('this');
        return new CLet('const', ths, new BThis(), k(ths));
      case 'UpdateExpression':
        return addLoc(cpsExpr(expr.argument, (v: AExpr) => {
          const tmp = path.scope.generateUidIdentifier('update');
          return new CLet('const', tmp,
            new BIncrDecr(expr.operator, v, expr.prefix), k(tmp));
        }, ek, path), expr.start, expr.end, expr.loc);
    }
    throw new Error(`${expr.type} not yet implemented`);
  }

function cpsStmt(stmt: t.Statement,
  k: (arg: AExpr) => CExpr,
  ek: (arg: AExpr) => CExpr,
  path: NodePath<t.Node>): CExpr {
    switch (stmt.type) {
      case "BlockStatement": {
        let [head, ...tail] = stmt.body;
        if (head === undefined) {
          return addLoc(k(undefExpr), stmt.start, stmt.end, stmt.loc);
        } else if (tail === []) {
          return addLoc(cpsStmt(head, k, ek, path), stmt.start, stmt.end, stmt.loc);
        } else {
          return addLoc(cpsStmt(head, v => cpsStmt(t.blockStatement(tail),
            k, ek, path), ek, path), stmt.start, stmt.end, stmt.loc);
        }
      }
      case "BreakStatement":
        return addLoc(cpsExpr(stmt.label, label =>
          new CAdminApp(label, [undefExpr]), ek, path), stmt.start, stmt.end, stmt.loc);
      case "EmptyStatement":
        return addLoc(k(undefExpr), stmt.start, stmt.end, stmt.loc);
      case "ExpressionStatement":
        return addLoc(cpsExpr(stmt.expression, _ =>
          k(undefExpr), ek, path), stmt.start, stmt.end, stmt.loc);
      case "IfStatement":
        return addLoc(cpsExpr(stmt.test, tst => new ITE(tst,
          cpsStmt(stmt.consequent, k, ek, path),
          cpsStmt(stmt.alternate, k, ek, path)), ek, path),
          stmt.start, stmt.end, stmt.loc);
      case "LabeledStatement": {
        const kErr = path.scope.generateUidIdentifier('kErr');
        return addLoc(cpsExpr(t.callExpression(t.functionExpression(undefined,
          [stmt.label, kErr], flatBodyStatement([stmt.body])), []),
          k, ek, path), stmt.start, stmt.end, stmt.loc);
      }
      case "ReturnStatement":
        let returnK = (r: AExpr) =>
          new CAdminApp(<t.Identifier>(<ReturnStatement>stmt).kArg, [r]);
        return addLoc(cpsExpr(stmt.argument, r =>
          returnK(r), ek, path), stmt.start, stmt.end, stmt.loc);
      case 'ThrowStatement':
        return addLoc(cpsExpr(stmt.argument, ek, v =>
          new CAdminApp(v, [undefExpr]), path), stmt.start, stmt.end, stmt.loc);
      case 'TryStatement':
        const kFun = path.scope.generateUidIdentifier('kFun');
        const kErr = path.scope.generateUidIdentifier('kErr');
        return addLoc(cpsExpr(t.callExpression(t.functionExpression(undefined,
          [kFun, kErr],
          stmt.block), []), k, e =>
            new CLet('const', stmt.handler.param, new BAtom(e),
              cpsStmt(stmt.handler.body, k, ek, path)), path),
          stmt.start, stmt.end, stmt.loc);
      case "VariableDeclaration": {
        const { declarations } = stmt;
        const [head, ...tail] = declarations;
        if (head === undefined) {
          return addLoc(k(undefExpr), stmt.start, stmt.end, stmt.loc);
        } else if (tail === []) {
          return addLoc(cpsExpr(head.init, v =>
            new CLet(stmt.kind, <t.Identifier>head.id, new BAtom(v), k(undefExpr)),
            ek, path), stmt.start, stmt.end, stmt.loc);
        } else {
          return addLoc(cpsExpr(head.init, v =>
            new CLet(stmt.kind, <t.Identifier>head.id, new BAtom(v),
              cpsStmt(t.variableDeclaration(stmt.kind, tail), k, ek, path)),
            ek, path), stmt.start, stmt.end, stmt.loc);
        }
      }
      default:
        throw new Error(`${stmt.type} not yet implemented`);
    }
  }

function generateBExpr(bexpr: BExpr): t.Expression {
  switch (bexpr.type) {
    case 'atom':
      return addLoc(bexpr.atom, bexpr.start, bexpr.end, bexpr.loc);
    case 'BFun':
      return addLoc(transformed(t.functionExpression(bexpr.id,
        bexpr.args,
        flatBodyStatement(generateJS(bexpr.body)))),
        bexpr.start, bexpr.end, bexpr.loc);
    case 'BAdminFun':
      return addLoc(t.functionExpression(bexpr.id,
        bexpr.args,
        flatBodyStatement(generateJS(bexpr.body))),
        bexpr.start, bexpr.end, bexpr.loc);
    case 'ConditionalExpression':
      return bexpr;
    case 'op2':
      return addLoc(t.binaryExpression(bexpr.name, bexpr.l, bexpr.r),
        bexpr.start, bexpr.end, bexpr.loc);
    case 'op1':
      return addLoc(t.unaryExpression(bexpr.name, bexpr.v),
        bexpr.start, bexpr.end, bexpr.loc);
    case 'assign':
      return addLoc(t.assignmentExpression(bexpr.operator, bexpr.x, bexpr.v),
        bexpr.start, bexpr.end, bexpr.loc);
    case 'obj':
      const properties : t.ObjectProperty[] = [];
      bexpr.fields.forEach((value, key) =>
        properties.push(t.objectProperty(key, value)));
      return addLoc(t.objectExpression(properties),
        bexpr.start, bexpr.end, bexpr.loc);
    case 'get':
      return addLoc(t.memberExpression(bexpr.object, bexpr.property),
        bexpr.start, bexpr.end, bexpr.loc);
    case 'NewExpression':
      return bexpr;
    case 'incr/decr':
      return addLoc(t.updateExpression(bexpr.operator, bexpr.argument, bexpr.prefix),
        bexpr.start, bexpr.end, bexpr.loc);
    case 'arraylit':
      return addLoc(t.arrayExpression(bexpr.arrayItems),
        bexpr.start, bexpr.end, bexpr.loc);
    case 'seq':
      return addLoc(t.sequenceExpression(bexpr.elements), bexpr.start, bexpr.end, bexpr.loc);
    case 'this':
      return addLoc(t.thisExpression(), bexpr.start, bexpr.end, bexpr.loc);
    case 'update':
      throw new Error(`${bexpr.type} generation is not yet implemented`);
  }
}

function generateJS(cexpr: CExpr): t.Statement[] {
  switch (cexpr.type) {
    case 'app':
      return [addLoc(t.returnStatement(t.callExpression(cexpr.f, cexpr.args)),
        cexpr.start, cexpr.end, cexpr.loc)];
    case 'callapp':
      return [addLoc(t.returnStatement(call(t.callExpression(cexpr.f, cexpr.args))),
        cexpr.start, cexpr.end, cexpr.loc)];
    case 'applyapp':
      return [addLoc(t.returnStatement(apply(t.callExpression(cexpr.f, cexpr.args))),
        cexpr.start, cexpr.end, cexpr.loc)];
    case 'adminapp':
      return [addLoc(t.returnStatement(administrative(t.callExpression(cexpr.f, cexpr.args))),
        cexpr.start, cexpr.end, cexpr.loc)];
    case 'ITE':
      return [addLoc(t.ifStatement(cexpr.e1,
        flatBodyStatement(generateJS(cexpr.e2)),
        flatBodyStatement(generateJS(cexpr.e3))),
        cexpr.start, cexpr.end, cexpr.loc)];
    case 'let':
      const decl = letExpression(cexpr.x, generateBExpr(cexpr.named), cexpr.kind);
      return [addLoc(decl, cexpr.start, cexpr.end, cexpr.loc),
        ...generateJS(cexpr.body)];
  }
}

const cpsExpression : Visitor = {
  Program: function (path: NodePath<t.Program>): void {
    const { body } = path.node;
    const cexpr = cpsStmt(t.blockStatement(body),
      v => new CAdminApp(t.identifier('onDone'), [v]),
      v => new CAdminApp(t.identifier('onError'), [v]), path);
    path.node.body = generateJS(cexpr);
  }
};

module.exports = function() {
  return { visitor: cpsExpression };
};
