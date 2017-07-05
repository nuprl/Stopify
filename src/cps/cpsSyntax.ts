import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import {
  tag,
  flatBodyStatement,
  letExpression,
  transformed,
  KArg,
} from '../common/helpers';
import { union } from './fvHelpers'

const administrative = <T>(t: T) => tag('isAdmin', t, true);
const call = <T>(t: T) => tag('isCall', t, true);
const apply = <T>(t: T) => tag('isApply', t, true);
const directApply = <T>(t: T) => tag('isDirect', t, true);

import {
  AExpr, BExpr, CExpr, AtomicBExpr, Node, BFun, BAdminFun, BAtom, BOp2, BOp1,
  BLOp, LVal, LValMember, BAssign, BObj, BArrayLit, BGet, BIncrDecr, BUpdate,
  BSeq, BThis, BNew, CApp, CCallApp, CApplyApp, CAdminApp, ITE, CLet
} from './cexpr';
import {CPS, ret} from './cpsMonad';
import {raiseFuns} from './liftFunExprs';

class Continuation {
  constructor(private k: AExpr | ((k: AExpr) => CPS<CExpr, CExpr>)) {}

  apply(e: AExpr): CPS<CExpr, CExpr> {
    if (typeof this.k === 'function') {
      return this.k(e);
    } else {
      return ret<CExpr, CExpr>(new CAdminApp(this.k, [e]));
    }
  }

  toName(k: (name: AExpr) => CPS<CExpr, CExpr>,
    path: NodePath<t.Node>): CPS<CExpr, CExpr> {
      const cont = this.k;
      if (typeof cont === 'function') {
        const r = path.scope.generateUidIdentifier('r');
        const fName = path.scope.generateUidIdentifier('k');
        return k(fName).bind(b =>
          cont(r).map(fb =>
            new CLet('const', fName, new BAdminFun(undefined, [r], fb), b)));
      } else {
        return k(cont);
      }
    }
}

const undefExpr: AExpr = t.identifier("undefined");

function cpsExprList(exprs: (t.Expression | t.SpreadElement)[],
  k: (args: (AExpr | t.SpreadElement)[]) => CPS<CExpr,CExpr>,
  ek: Continuation,
  path: NodePath<t.Node>): CPS<CExpr,CExpr> {
    if (exprs.length === 0) {
      return k([]);
    }
    else {
      const [ hd, ...tl ] = exprs;
      if (t.isExpression(hd)) {
        return cpsExpr(hd,
          new Continuation((v: AExpr) => cpsExprList(tl,
            (vs: AExpr[]) => k([v, ...vs]),
            ek,
            path)), ek, path);
      } else {
        return cpsExprList(tl,
          (vs: AExpr[]) => k([hd, ...vs]),
          ek,
          path);
      }
    }
  }

function cpsObjMembers(mems: t.ObjectMember[],
  k: (args: AExpr[][]) => CPS<CExpr,CExpr>,
  ek: Continuation,
  path: NodePath<t.Node>): CPS<CExpr,CExpr> {
    if (mems.length === 0) {
      return k([]);
    }
    const [ hd, ...tl ] = mems;
    switch (hd.type) {
      case 'ObjectProperty':
        return cpsExpr(hd.key,
          new Continuation((id: AExpr) => cpsExpr(hd.value,
            new Continuation((v: AExpr) => cpsObjMembers(tl,
              (vs: AExpr[][]) => k([[id,v], ...vs]),
              ek,
              path)), ek, path)), ek, path);
      case 'ObjectMethod':
        return cpsExpr(hd.key,
          new Continuation((id: AExpr) =>
            cpsExpr(t.functionExpression(<t.Identifier>hd.key, hd.params, hd.body),
              new Continuation((v: AExpr) =>
                cpsObjMembers(tl,
                  (vs: AExpr[][]) => k([[id,v], ...vs]),
                  ek,
                  path)), ek, path)), ek, path);
    }
  }

function cpsLVal(lval: t.LVal,
  k: (arg: LVal) => CPS<CExpr,CExpr>,
  ek: Continuation,
  path: NodePath<t.Node>): CPS<CExpr,CExpr> {
    switch(lval.type) {
      case 'Identifier':
        return k(lval);
      case 'MemberExpression':
        return cpsExpr(lval.object, new Continuation(l =>
          cpsExpr(lval.property, new Continuation(r =>
            k(new LValMember(l, r, lval.computed))), ek, path)),
          ek, path);
      default:
        throw new Error(`Unexpected error: LVal of type ${lval.type} not yet implemented`);
    }
  }

function cpsExpr(expr: t.Expression,
  k: Continuation,
  ek: Continuation,
  path: NodePath<t.Node>): CPS<CExpr,CExpr> {
    if (expr === null || expr === undefined) {
      return k.apply(t.nullLiteral());
    }
    switch (expr.type) {
      case 'Identifier':
      case 'BooleanLiteral':
      case 'NumericLiteral':
      case 'StringLiteral':
      case 'NullLiteral':
      case 'RegExpLiteral':
      case 'TemplateLiteral':
        return k.apply(expr);
      case 'ArrayExpression':
        return cpsExprList(expr.elements, (args: AExpr[]) =>
          k.apply(new AtomicBExpr(new BArrayLit(args))), ek, path);
      case "AssignmentExpression":
        const assign = path.scope.generateUidIdentifier('assign');
        return cpsLVal(expr.left, l =>
          cpsExpr(expr.right, new Continuation(r =>
            k.apply(assign).map(c =>
              new CLet('const', assign, new BAssign(expr.operator, l, r),
                c))), ek, path), ek, path);
      case 'BinaryExpression':
        return cpsExpr(expr.left, new Continuation(l =>
          cpsExpr(expr.right, new Continuation(r =>
            k.apply(new AtomicBExpr(new BOp2(expr.operator, l, r)))), ek, path)),
          ek, path);
      case 'LogicalExpression':
        if (expr.operator === '&&') {
          const if_cont = path.scope.generateUidIdentifier('if_cont');
          return k.apply(if_cont).bind(c =>
            cpsExpr(expr.left, new Continuation(l =>
              cpsExpr(expr.right, new Continuation(r =>
                ret<CExpr,CExpr>(new CAdminApp(if_cont, [r]))),
                ek, path).map(r =>
                  new CLet('const', if_cont,
                    new BAdminFun(undefined, [if_cont], c),
                    new ITE(l,
                      r,
                      new CAdminApp(if_cont, [t.booleanLiteral(false)]))))),
              ek, path));
        } else {
          const if_cont = path.scope.generateUidIdentifier('if_cont');
          return k.apply(if_cont).bind(c =>
            cpsExpr(expr.left, new Continuation(l =>
              cpsExpr(expr.right, new Continuation(r =>
                ret<CExpr,CExpr>(new CAdminApp(if_cont, [r]))),
                ek, path).map(r =>
                  new CLet('const', if_cont,
                    new BAdminFun(undefined, [if_cont], c),
                    new ITE(l,
                      new CAdminApp(if_cont, [l]),
                      r)))),
              ek, path));
        }
      case 'ConditionalExpression':
        return cpsExpr(expr.test, new Continuation(tst => {
          const cont = path.scope.generateUidIdentifier('cond_cont');
          return k.apply(cont).bind(cond_cont =>
            cpsExpr(expr.consequent, new Continuation(v =>
              ret<CExpr,CExpr>(new CAdminApp(cont, [v]))), ek, path)
            .bind(consequent =>
              cpsExpr(expr.alternate, new Continuation(v =>
                ret<CExpr,CExpr>(new CAdminApp(cont, [v]))), ek, path)
              .map(alternate =>
                new CLet('const', cont, new BAdminFun(undefined, [cont], cond_cont),
                  new ITE(tst, consequent, alternate)))));
        }), ek, path);
      case 'UnaryExpression':
        return cpsExpr(expr.argument, new Continuation(v =>
          k.apply(new AtomicBExpr(new BOp1(expr.operator, v)))), ek, path);
      case "FunctionExpression":
        const func = path.scope.generateUidIdentifier('func');
        return k.apply(func).bind(c =>
          cpsStmt(expr.body,
            new Continuation(r =>
              ret<CExpr,CExpr>(new CAdminApp(<t.Identifier>expr.params[0], [r]))),
            new Continuation(r =>
              ret<CExpr,CExpr>(new CAdminApp(<t.Identifier>expr.params[1], [r]))),
            path).map(body =>
              new CLet('const', func,
                new BFun(expr.id, <t.Identifier[]>expr.params, body), c)));
      case "CallExpression":
        const callee = expr.callee;
        if (t.isMemberExpression(callee) &&
          ((t.isIdentifier(callee.property) &&
            (callee.property.name === 'apply' ||
              callee.property.name === 'call')) ||
            ((callee.computed &&
              t.isStringLiteral(callee.property) &&
              (callee.property.value === 'apply' ||
                callee.property.value === 'call'))))) {
          return cpsExpr(callee.object, new Continuation(f =>
            cpsExprList(expr.arguments, args =>
              k.toName(xK =>
                ek.toName(xExn =>
                  (<t.Identifier>callee.property).name === 'apply' ?
                  ret<CExpr,CExpr>(new CApplyApp(f, [xK, xExn, ...args])) :
                  ret<CExpr,CExpr>(new CCallApp(f, [xK, xExn, ...args])),
                  path), path), ek, path)), ek, path);

          /*
              const kFun = path.scope.generateUidIdentifier('kFun');
              const kErr = path.scope.generateUidIdentifier('kErr');
              const r = path.scope.generateUidIdentifier('r');
              return k.apply(r).bind(kn =>
                ek.apply(r).map(ekn =>
                  new CLet('const', kFun, new BAdminFun(undefined, [r], kn),
                    new CLet('const', kErr, new BAdminFun(undefined, [r], ekn),
                      (<t.Identifier>callee.property).name === 'apply' ?
                      new CApplyApp(f, [kFun, kErr, ...args]) :
                      new CCallApp(f, [kFun, kErr, ...args])))));
            }, ek, path)), ek, path);
           */
        } else if (t.isMemberExpression(callee) &&
          (t.isIdentifier(callee.property) ||
            ((callee.computed &&
              t.isStringLiteral(callee.property))))) {
          return cpsExpr(callee.object, new Continuation(f =>
            cpsExprList(expr.arguments, args =>
              k.toName(xK =>
                ek.toName(xExn =>
                  ret<CExpr,CExpr>(new CCallApp(new AtomicBExpr(new BGet(f,
                    <AExpr>callee.property, callee.computed)),
                    [xK, xExn, f, ...args])),
                  path), path), ek, path)), ek, path);
        } else {
          return cpsExpr(callee, new Continuation(f =>
            cpsExprList(expr.arguments, args =>
              k.toName(xK =>
                ek.toName(xExn =>
                  ret<CExpr,CExpr>(new CApp(f, [xK, xExn, ...args])),
                  path), path), ek, path)), ek, path);
        }
      case 'MemberExpression':
        return cpsExpr(expr.object, new Continuation(o =>
          cpsExpr(expr.property, new Continuation(p =>
            k.apply(new AtomicBExpr(new BGet(o, p, expr.computed)))), ek, path)),
          ek, path);
      case 'NewExpression':
        const tmp = path.scope.generateUidIdentifier('new');
        return cpsExpr(expr.callee, new Continuation(f =>
          cpsExprList(expr.arguments, args =>
            k.apply(tmp).map(c =>
              new CLet('const', tmp, new BNew(f, args), c)), ek, path)), ek, path);
      case 'ObjectExpression':
        return cpsObjMembers(<t.ObjectMember[]>expr.properties,
          (mems: AExpr[][]) => {
            const obj = path.scope.generateUidIdentifier('obj');
            const fields = new Map();
            mems.forEach(function (item) {
              const [id, v] = item;
              fields.set(id, v);
            });
            return k.apply(obj).map(c => new CLet('const', obj, new BObj(fields), c));
          },
          ek,
          path);
      case 'SequenceExpression':
        return cpsExprList(expr.expressions, (vs: AExpr[]) => {
          const seq = path.scope.generateUidIdentifier('seq');
          return k.apply(seq).map(c => new CLet('const', seq, new BSeq(vs), c));
        }, ek, path);
      case 'ThisExpression':
        return k.apply(new AtomicBExpr(new BThis()));
      case 'UpdateExpression': {
        const tmp = path.scope.generateUidIdentifier('update');
        return k.apply(tmp).bind(c =>
          cpsExpr(expr.argument, new Continuation(v =>
            ret<CExpr,CExpr>(new CLet('const', tmp,
              new BIncrDecr(expr.operator, v, expr.prefix), c))), ek, path));
      }
    }
    throw new Error(`${expr.type} not yet implemented`);
  }

function cpsStmt(stmt: t.Statement,
  k: Continuation,
  ek: Continuation,
  path: NodePath<t.Node>): CPS<CExpr,CExpr> {
    switch (stmt.type) {
      case "BlockStatement": {
        let [head, ...tail] = stmt.body;
        if (head === undefined) {
          return k.apply(undefExpr);
        } else if (tail === []) {
          return cpsStmt(head, k, ek, path);
        } else {
          return cpsStmt(head, new Continuation(v =>
            cpsStmt(t.blockStatement(tail), k, ek, path)), ek, path);
        }
      }
      case "BreakStatement":
        return cpsExpr(stmt.label, new Continuation(label =>
          ret<CExpr,CExpr>(new CAdminApp(label, [undefExpr]))), ek, path);
      case "EmptyStatement":
        return k.apply(undefExpr);
      case "ExpressionStatement":
        const exp = path.scope.generateUidIdentifier('exp');
        return k.apply(undefExpr).bind(e =>
          cpsExpr(stmt.expression, new Continuation(v =>
            ret<CExpr, CExpr>(new CLet('const', exp, new BAtom(v), e))), ek, path));
      case "IfStatement":
        return cpsExpr(stmt.test, new Continuation(tst => {
          const cont = path.scope.generateUidIdentifier('if_cont');
          return k.apply(cont).bind(if_cont =>
            cpsStmt(stmt.consequent, new Continuation(v =>
              ret<CExpr,CExpr>(new CAdminApp(cont, [v]))), ek, path)
            .bind(consequent =>
              cpsStmt(stmt.alternate, new Continuation(v =>
                ret<CExpr,CExpr>(new CAdminApp(cont, [v]))), ek, path)
              .map(alternate =>
                new CLet('const', cont, new BAdminFun(undefined, [cont], if_cont),
                  new ITE(tst, consequent, alternate)))));
        }), ek, path);
      case "LabeledStatement": {
        const lblFunc = path.scope.generateUidIdentifier('lblFun');
        const kErr = path.scope.generateUidIdentifier('kErr');
        return cpsExpr(t.functionExpression(undefined, [stmt.label, kErr],
          flatBodyStatement([stmt.body])), new Continuation(f =>
            cpsExpr(t.callExpression(t.memberExpression(lblFunc, t.identifier('call')),
              [t.thisExpression()]), k, ek, path).map(c =>
                new CLet('const', lblFunc, new BAtom(f), c))), ek, path);
      }
      case "ReturnStatement":
        let returnK = new Continuation((r: AExpr) =>
          ret<CExpr,CExpr>(new CAdminApp((<KArg<t.ReturnStatement>>stmt).kArg, [r])));
        return cpsExpr(stmt.argument, returnK, ek, path);
      case 'ThrowStatement':
        return cpsExpr(stmt.argument, ek, new Continuation(v =>
          ret<CExpr,CExpr>(new CAdminApp(v, [undefExpr]))), path);
      case 'TryStatement':
        const kFun = path.scope.generateUidIdentifier('kFun');
        const kErr = path.scope.generateUidIdentifier('kErr');
        const tryFunc = path.scope.generateUidIdentifier('try');
        const tlAssign = path.scope.generateUidIdentifier('tlEkAssign');
        const tlEVal = path.scope.generateUidIdentifier('e');
        const topLevel = t.identifier('$topLevelEk');
        const fin = stmt.finalizer === null ?
          k :
          new Continuation((v: AExpr) => cpsStmt(stmt.finalizer, k, ek, path));
        const err = stmt.handler === null ?
          ek :
          new Continuation((e: AExpr) =>
            fin.apply(topLevel).bind(tl =>
              cpsStmt(stmt.handler.body, fin, ek, path).bind(c =>
                ek.apply(tlEVal).map(eVal =>
                  new CLet('const', tlAssign, new BAssign('=', topLevel,
                    new AtomicBExpr(new BAdminFun(undefined, [tlEVal], eVal))),
                    new CLet('const', stmt.handler.param, new BAtom(e), c))))));
        return cpsExpr(t.functionExpression(undefined, [kFun, kErr], stmt.block),
          new Continuation(f =>
            cpsExpr(t.callExpression(t.memberExpression(tryFunc, t.identifier('call')),
              [t.thisExpression()]), fin, err, path).map(c =>
                new CLet('const', tryFunc, new BAtom(f), c))), ek, path);
      case "VariableDeclaration": {
        const { declarations } = stmt;
        const [head, ...tail] = declarations;
        if (head === undefined) {
          return k.apply(undefExpr);
        } else if (tail === []) {
          return cpsExpr(head.init, new Continuation(v =>
            k.apply(undefExpr).map(c =>
              new CLet(stmt.kind, <t.Identifier>head.id, new BAtom(v), c))),
            ek, path);
        } else {
          return cpsExpr(head.init, new Continuation(v =>
            cpsStmt(t.variableDeclaration(stmt.kind, tail), k, ek, path).map(c =>
              new CLet(stmt.kind, <t.Identifier>head.id, new BAtom(v), c))),
            ek, path);
        }
      }
      default:
        throw new Error(`${stmt.type} not yet implemented`);
    }
  }

function generateLVal(lval: LVal): t.LVal {
  switch (lval.type) {
    case 'Identifier':
      return lval;
    case 'lval_member':
      return t.memberExpression(generateAExpr(lval.object),
        generateAExpr(lval.property), lval.computed);
    default:
      throw new Error(
        `Unexpected error: JS generation for LVal of typ ${lval.type} not yet implemented`);
  }
}

function generateAExpr(aexpr: AExpr): t.Expression {
  switch (aexpr.type) {
    case 'Identifier':
    case 'BooleanLiteral':
    case 'NumericLiteral':
    case 'StringLiteral':
    case 'NullLiteral':
    case 'RegExpLiteral':
    case 'TemplateLiteral':
      return aexpr;
    case 'atomic_bexpr':
      return generateBExpr(aexpr.bexpr);
  }
}

function generateAExprSpread(aexpr: AExpr | t.SpreadElement):
t.Expression | t.SpreadElement {
  switch (aexpr.type) {
    case 'SpreadElement':
      return aexpr;
    default:
      return generateAExpr(aexpr);
  }
}

function generateBExpr(bexpr: BExpr): t.Expression {
  switch (bexpr.type) {
    case 'atom':
      return generateAExpr(bexpr.atom);
    case 'BFun':
      return transformed(t.functionExpression(bexpr.id,
        bexpr.args,
        flatBodyStatement(generateJS(bexpr.body))));
    case 'BAdminFun':
      return t.arrowFunctionExpression(bexpr.args,
        flatBodyStatement(generateJS(bexpr.body)));
    case 'op2':
      return t.binaryExpression(bexpr.oper,
        generateAExpr(bexpr.l), generateAExpr(bexpr.r));
    case 'op1':
      return t.unaryExpression(bexpr.oper, generateAExpr(bexpr.v));
    case 'lop':
      return t.logicalExpression(bexpr.oper,
        generateAExpr(bexpr.l), generateAExpr(bexpr.r));
    case 'assign':
      return t.assignmentExpression(bexpr.operator,
        generateLVal(bexpr.x), generateAExpr(bexpr.v));
    case 'obj':
      const properties : t.ObjectProperty[] = [];
      bexpr.fields.forEach((value, key) =>
        properties.push(t.objectProperty(key, generateAExpr(value))));
      return t.objectExpression(properties);
    case 'get':
      return t.memberExpression(generateAExpr(bexpr.object),
        generateAExpr(bexpr.property), bexpr.computed);
    case 'incr/decr':
      return t.updateExpression(bexpr.operator,
        generateAExpr(bexpr.argument), bexpr.prefix);
    case 'arraylit':
      return t.arrayExpression(bexpr.arrayItems.map(x => generateAExpr(x)));
    case 'seq':
      return t.sequenceExpression(bexpr.elements.map(x => generateAExpr(x)));
    case 'this':
      return t.thisExpression();
    case 'new':
      return t.newExpression(generateAExpr(bexpr.f),
        bexpr.args.map(x => generateAExprSpread(x)));
    case 'update':
      throw new Error(`${bexpr.type} generation is not yet implemented`);
  }
}

function generateJS(cexpr: CExpr): t.Statement[] {
  switch (cexpr.type) {
    case 'app':
      return [t.returnStatement(t.callExpression(generateAExpr(cexpr.f),
        cexpr.args.map(x => generateAExprSpread(x))))];
    case 'callapp':
      return [t.returnStatement(call(t.callExpression(generateAExpr(cexpr.f),
        cexpr.args.map(x => generateAExprSpread(x)))))];
    case 'applyapp':
      return [t.returnStatement(apply(t.callExpression(generateAExpr(cexpr.f),
        cexpr.args.map(x => generateAExprSpread(x)))))];
    case 'adminapp':
      return [t.returnStatement(administrative(t.callExpression(generateAExpr(cexpr.f),
        cexpr.args.map(x => generateAExprSpread(x)))))];
    case 'ITE':
      return [t.ifStatement(generateAExpr(cexpr.e1),
        flatBodyStatement(generateJS(cexpr.e2)),
        flatBodyStatement(generateJS(cexpr.e3)))];
    case 'let':
      const decl = letExpression(cexpr.x, generateBExpr(cexpr.named), cexpr.kind);
      return [decl,
        ...generateJS(cexpr.body)];
  }
}

const cpsExpression : Visitor = {
  Program: {
    enter(path: NodePath<t.Program>): void {
      const { body } = path.node;
      const onDone = t.identifier('$onDone');
      const onError = t.identifier('$onError');

      const cexpr = cpsStmt(t.blockStatement(body),
        new Continuation(v => ret<CExpr,CExpr>(new CAdminApp(onDone, [v]))),
        new Continuation(v => ret<CExpr,CExpr>(new CAdminApp(onError, [v]))),
        path).apply(x => x);
      const kont =
      t.arrowFunctionExpression([onDone, onError],
        t.blockStatement(generateJS(raiseFuns(cexpr))));
      const kId = path.scope.generateUidIdentifier('k');
      const kontBind = letExpression(kId, kont, 'const');
      const kontCall = administrative(t.callExpression(kId, [onDone, onError]));

      path.node.body = [
        kontBind,
        t.returnStatement(kontCall)
      ];
    }
  }
};

module.exports = function() {
  return { visitor: cpsExpression };
};
