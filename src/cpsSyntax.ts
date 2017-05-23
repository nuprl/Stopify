import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import {flatBodyStatement, letExpression, ReturnStatement} from './helpers';

type binop = "+" | "-" | "/" | "%" | "*" | "**" | "&" | "|" | ">>" | ">>>" |
  "<<" | "^" | "==" | "===" | "!=" | "!==" | "in" | "instanceof" | ">" |
  "<" | ">=" | "<=";

type unop = "-" | "+" | "!" | "~" | "typeof" | "void" | "delete";

type kind = 'const' | 'var' | 'let' | undefined;

const nullLoc : t.SourceLocation = {
  start: {
    line: 0,
    column: 0,
  },
  end: {
    line: 0,
    column: 0,
  },
};

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

class BAtom extends Node {
  type: 'atom';

  constructor(public atom: AExpr) {
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

type BExpr =
  BFun | BAtom | BOp2 | BOp1 | BAssign | BObj | BArrayLit | BGet | BIncrDecr
  | BUpdate | t.NewExpression

class CApp extends Node {
  type: 'app';

  constructor(public f: AExpr, public args: AExpr[]) {
    super();
    this.type = 'app';
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

type CExpr = CLet | ITE | CApp;

function cpsExprList(exprs: t.Expression[],
  k: (args: AExpr[]) => CExpr,
  ek: (arg: AExpr) => CExpr,
  path: NodePath<t.Node>): CExpr {
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
        return k(expr);
      case 'ArrayExpression':
        return cpsExprList(<t.Expression[]>expr.elements, (args: AExpr[]) => {
          const arr = path.scope.generateUidIdentifier('arr');
          return new CLet('const', arr, new BArrayLit(args), k(arr));
        }, ek, path);
      case "AssignmentExpression":
        return cpsExpr(expr.right, r => {
          const assign = path.scope.generateUidIdentifier('assign');
          return new CLet('const', assign, new BAssign(expr.operator, expr.left, r), k(r));
        }, ek, path);
      case 'BinaryExpression':
        return cpsExpr(expr.left, l =>
          cpsExpr(expr.right, r => {
            let bop = path.scope.generateUidIdentifier('bop');
            return new CLet('const', bop, new BOp2(expr.operator, l, r), k(bop));
          }, ek, path), ek, path);
      case 'ConditionalExpression':
        return cpsExpr(expr.test, tst => new ITE(tst,
          cpsExpr(expr.consequent, k, ek, path),
          cpsExpr(expr.alternate, k, ek, path)), ek, path);
      case 'UnaryExpression':
        return cpsExpr(expr.argument, v => {
          let unop = path.scope.generateUidIdentifier('unop');
          return new CLet('const', unop, new BOp1(expr.operator, v), k(unop));
        }, ek, path);
      case "FunctionExpression":
        let func = path.scope.generateUidIdentifier('func');
        return new CLet('const', func, new BFun(expr.id, <t.Identifier[]>(expr.params),
          cpsStmt(expr.body,
            r => new CApp(<t.Identifier>(expr.params[0]), [r]),
            r => new CApp(<t.Identifier>(expr.params[1]), [r]),
            path)), k(func));
      case "CallExpression":
        return cpsExpr(expr.callee, f =>
          cpsExprList(<t.Expression[]>(expr.arguments), args => {
            const kFun = path.scope.generateUidIdentifier('kFun');
            const kErr = path.scope.generateUidIdentifier('kErr');
            const r = path.scope.generateUidIdentifier('r');
            return new CLet('const', kFun, new BFun(undefined, [r], k(r)),
              new CLet('const', kErr, new BFun(undefined, [r], ek(r)),
                new CApp(f, [kFun, kErr, ...args])));
          }, ek, path), ek, path);
      case 'MemberExpression':
        return cpsExpr(expr.object, o =>
          cpsExpr(expr.property, p => {
            const obj = path.scope.generateUidIdentifier('obj');
            return new CLet('const', obj, new BGet(o, p), k(obj));
          }, ek, path), ek, path);
      case 'NewExpression':
        const tmp = path.scope.generateUidIdentifier('new');
        return new CLet('const', tmp, expr, k(tmp));
      case 'ObjectExpression':
        return cpsObjMembers(<t.ObjectMember[]>expr.properties,
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
          path);
      case 'UpdateExpression':
        return cpsExpr(expr.argument, (v: AExpr) => {
          const tmp = path.scope.generateUidIdentifier('update');
          return new CLet('const', tmp, new BIncrDecr(expr.operator, v, expr.prefix), k(tmp));
        }, ek, path);
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
          return k(undefExpr);
        } else if (tail === []) {
          return cpsStmt(head, k, ek, path);
        } else {
          return cpsStmt(head, v => cpsStmt(t.blockStatement(tail),
            k, ek, path), ek, path);
        }
      }
      case "BreakStatement":
        return cpsExpr(stmt.label, label => new CApp(label, [undefExpr]), ek, path);
      case "EmptyStatement":
        return k(undefExpr);
      case "ExpressionStatement":
        return cpsExpr(stmt.expression, _ => k(undefExpr), ek, path);
      case "IfStatement":
        return cpsExpr(stmt.test, tst => new ITE(tst,
          cpsStmt(stmt.consequent, k, ek, path),
          cpsStmt(stmt.alternate, k, ek, path)), ek, path);
      case "LabeledStatement": {
        const kErr = path.scope.generateUidIdentifier('kErr');
        return cpsExpr(t.callExpression(t.functionExpression(undefined,
          [stmt.label, kErr], flatBodyStatement([stmt.body])), []),
          k, ek, path);
      }
      case "ReturnStatement":
        let returnK = (r: AExpr) =>
          new CApp(<t.Identifier>(<ReturnStatement>stmt).kArg, [r]);
        return cpsExpr(stmt.argument, r => returnK(r), ek, path);
      case 'ThrowStatement':
        return cpsExpr(stmt.argument, ek, v => new CApp(v, [undefExpr]), path);
      case 'TryStatement':
        const kFun = path.scope.generateUidIdentifier('kFun');
        const kErr = path.scope.generateUidIdentifier('kErr');
        return cpsExpr(t.callExpression(t.functionExpression(undefined,
          [kFun, kErr],
          stmt.block), []), k, e =>
            new CLet('const', stmt.handler.param, new BAtom(e),
              cpsStmt(stmt.handler.body, k, ek, path)), path);
      case "VariableDeclaration": {
        const { declarations } = stmt;
        const [head, ...tail] = declarations;
        if (head === undefined) {
          return k(undefExpr);
        } else if (tail === []) {
          return cpsExpr(head.init, v =>
            new CLet(stmt.kind, <t.Identifier>head.id, new BAtom(v), k(undefExpr)), ek, path);
        } else {
          return cpsExpr(head.init, v =>
            new CLet(stmt.kind, <t.Identifier>head.id, new BAtom(v),
              cpsStmt(t.variableDeclaration(stmt.kind, tail), k, ek, path)), ek, path);
        }
      }
      default:
        throw new Error(`${stmt.type} not yet implemented`);
    }
  }

function generateBExpr(bexpr: BExpr): t.Expression {
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
        properties.push(t.objectProperty(key, value)));
      return t.objectExpression(properties);
    case 'get':
      return t.memberExpression(bexpr.object, bexpr.property);
    case 'NewExpression':
      return bexpr;
    case 'incr/decr':
      return t.updateExpression(bexpr.operator, bexpr.argument, bexpr.prefix);
    case 'arraylit':
      return t.arrayExpression(bexpr.arrayItems);
    case 'update':
      throw new Error(`${bexpr.type} generation is not yet implemented`);
  }
}

function generateJS(cexpr: CExpr): t.Statement[] {
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
      v => new CApp(t.identifier('onDone'), [v]),
      v => new CApp(t.identifier('onError'), [v]), path);
    path.node.body = generateJS(cexpr);
  }
};

module.exports = function() {
  return { visitor: cpsExpression };
};
