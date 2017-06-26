import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import {administrative,
  call,
  apply,
  directApply,
  flatBodyStatement,
  letExpression,
  transformed,
  KArg,
  union
} from '../common/helpers';

import {
  AExpr, BExpr, CExpr, AtomicBExpr, Node, BFun, BAdminFun, BAtom, BOp2, BOp1,
  BLOp, LVal, LValMember, BAssign, BObj, BArrayLit, BGet, BIncrDecr, BUpdate,
  BSeq, BThis, BNew, CApp, CCallApp, CApplyApp, CAdminApp, ITE, CLet
} from './cexpr';
import {CPS, ret} from './cpsMonad';
import {inlineApplications, raiseFuns} from './liftFunExprs';

const undefExpr: AExpr = t.identifier("undefined");

function cpsExprList(exprs: (t.Expression | t.SpreadElement)[],
  k: (args: (AExpr | t.SpreadElement)[]) => CPS<CExpr,CExpr>,
  ek: (arg: AExpr) => CPS<CExpr,CExpr>,
  path: NodePath<t.Node>): CPS<CExpr,CExpr> {
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
  k: (args: AExpr[][]) => CPS<CExpr,CExpr>,
  ek: (arg: AExpr) => CPS<CExpr,CExpr>,
  path: NodePath<t.Node>): CPS<CExpr,CExpr> {
    if (mems.length === 0) {
      return k([]);
    }
    const [ hd, ...tl ] = mems;
    switch (hd.type) {
      case 'ObjectProperty':
        return cpsExpr(hd.key,
          (id: AExpr) => cpsExpr(hd.value,
            (v: AExpr) => cpsObjMembers(tl,
              (vs: AExpr[][]) => k([[id,v], ...vs]),
              ek,
              path), ek, path), ek, path);
      case 'ObjectMethod':
        return cpsExpr(hd.key,
          (id: AExpr) => cpsExpr(t.functionExpression(<t.Identifier>hd.key, hd.params, hd.body),
            (v: AExpr) => cpsObjMembers(tl,
              (vs: AExpr[][]) => k([[id,v], ...vs]),
              ek,
              path), ek, path), ek, path);
    }
  }

function cpsLVal(lval: t.LVal,
  k: (arg: LVal) => CPS<CExpr,CExpr>,
  ek: (arg: AExpr) => CPS<CExpr,CExpr>,
  path: NodePath<t.Node>): CPS<CExpr,CExpr> {
    switch(lval.type) {
      case 'Identifier':
        return k(lval);
      case 'MemberExpression':
        return cpsExpr(lval.object, l =>
          cpsExpr(lval.property, r =>
              k(new LValMember(l, r, lval.computed)), ek, path),
          ek, path);
      default:
        throw new Error(`Unexpected error: LVal of type ${lval.type} not yet implemented`);
    }
  }

function cpsExpr(expr: t.Expression,
  k: (arg: AExpr) => CPS<CExpr,CExpr>,
  ek: (arg: AExpr) => CPS<CExpr,CExpr>,
  path: NodePath<t.Node>): CPS<CExpr,CExpr> {
    if (expr === null || expr === undefined) {
      return k(t.nullLiteral());
    }
    switch (expr.type) {
      case 'Identifier':
      case 'BooleanLiteral':
      case 'NumericLiteral':
      case 'StringLiteral':
      case 'NullLiteral':
      case 'RegExpLiteral':
      case 'TemplateLiteral':
        return k(expr);
      case 'ArrayExpression':
        return cpsExprList(expr.elements, (args: AExpr[]) =>
          k(new AtomicBExpr(new BArrayLit(args))), ek, path);
      case "AssignmentExpression":
        const assign = path.scope.generateUidIdentifier('assign');
        return cpsLVal(expr.left, l =>
          cpsExpr(expr.right, r =>
            k(assign).map(c =>
              new CLet('const', assign, new BAssign(expr.operator, l, r),
                c)), ek, path), ek, path);
      case 'BinaryExpression':
        return cpsExpr(expr.left, l =>
          cpsExpr(expr.right, r =>
            k(new AtomicBExpr(new BOp2(expr.operator, l, r))), ek, path),
          ek, path);
      case 'LogicalExpression':
        if (expr.operator === '&&') {
          const if_cont = path.scope.generateUidIdentifier('if_cont');
          return k(if_cont).bind(c =>
            cpsExpr(expr.left, l =>
              cpsExpr(expr.right, r =>
                ret<CExpr,CExpr>(new CAdminApp(if_cont, [r])),
                ek, path).map(r =>
                  new CLet('const', if_cont,
                    new BAdminFun(undefined, [if_cont], c),
                    new ITE(l,
                      r,
                      new CAdminApp(if_cont, [t.booleanLiteral(false)])))),
              ek, path));
        } else {
          const if_cont = path.scope.generateUidIdentifier('if_cont');
          return k(if_cont).bind(c =>
            cpsExpr(expr.left, l =>
              cpsExpr(expr.right, r =>
                ret<CExpr,CExpr>(new CAdminApp(if_cont, [r])),
                ek, path).map(r =>
                  new CLet('const', if_cont,
                    new BAdminFun(undefined, [if_cont], c),
                    new ITE(l,
                      new CAdminApp(if_cont, [l]),
                      r))),
              ek, path));
        }
      case 'ConditionalExpression':
        return cpsExpr(expr.test, tst => {
          const cont = path.scope.generateUidIdentifier('cond_cont');
          return k(cont).bind(cond_cont =>
            cpsExpr(expr.consequent, v => ret<CExpr,CExpr>(new CAdminApp(cont, [v])), ek, path)
            .bind(consequent =>
              cpsExpr(expr.alternate, v => ret<CExpr,CExpr>(new CAdminApp(cont, [v])), ek, path)
              .map(alternate =>
                new CLet('const', cont, new BAdminFun(undefined, [cont], cond_cont),
                  new ITE(tst, consequent, alternate)))));
        }, ek, path);
      case 'UnaryExpression':
        return cpsExpr(expr.argument, v =>
          k(new AtomicBExpr(new BOp1(expr.operator, v))), ek, path);
      case "FunctionExpression":
        return cpsStmt(expr.body,
          r => ret<CExpr,CExpr>(new CAdminApp(<t.Identifier>expr.params[0], [r])),
          r => ret<CExpr,CExpr>(new CAdminApp(<t.Identifier>expr.params[1], [r])),
          path).bind(body =>
            k(new AtomicBExpr(new BFun(expr.id, <t.Identifier[]>expr.params, body))));
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
          return cpsExpr(callee.object, f =>
            cpsExprList(expr.arguments, args => {
              const kFun = path.scope.generateUidIdentifier('kFun');
              const kErr = path.scope.generateUidIdentifier('kErr');
              const r = path.scope.generateUidIdentifier('r');
              return k(r).bind(kn =>
                ek(r).map(ekn =>
                    new CLet('const', kFun, new BAdminFun(undefined, [r], kn),
                      new CLet('const', kErr, new BAdminFun(undefined, [r], ekn),
                        (<t.Identifier>callee.property).name === 'apply' ?
                        new CApplyApp(f, [kFun, kErr, ...args]) :
                        new CCallApp(f, [kFun, kErr, ...args])))));
            }, ek, path), ek, path);
        } else if (t.isMemberExpression(callee) &&
          (t.isIdentifier(callee.property) ||
            ((callee.computed &&
              t.isStringLiteral(callee.property))))) {
          return cpsExpr(callee.object, f =>
            cpsExprList(expr.arguments, args => {
              const kFun = path.scope.generateUidIdentifier('kFun');
              const kErr = path.scope.generateUidIdentifier('kErr');
              const r = path.scope.generateUidIdentifier('r');
              return k(r).bind(kn =>
                ek(r).map(ekn =>
                  new CLet('const', kFun, new BAdminFun(undefined, [r], kn),
                    new CLet('const', kErr, new BAdminFun(undefined, [r], ekn),
                      new CCallApp(new AtomicBExpr(new BGet(f,
                        <AExpr>callee.property, callee.computed)),
                        [kFun, kErr, f, ...args])))));
            }, ek, path), ek, path);
        } else {
          return cpsExpr(callee, f =>
            cpsExprList(expr.arguments, args => {
              const kFun = path.scope.generateUidIdentifier('kFun');
              const kErr = path.scope.generateUidIdentifier('kErr');
              const r = path.scope.generateUidIdentifier('r');
              return k(r).bind(kn =>
                ek(r).map(ekn =>
                  new CLet('const', kFun, new BAdminFun(undefined, [r], kn),
                    new CLet('const', kErr, new BAdminFun(undefined, [r], ekn),
                      new CApp(f, [kFun, kErr, ...args])))));
            }, ek, path), ek, path);
        }
      case 'MemberExpression':
        return cpsExpr(expr.object, o =>
          cpsExpr(expr.property, p =>
            k(new AtomicBExpr(new BGet(o, p, expr.computed))), ek, path),
          ek, path);
      case 'NewExpression':
        const tmp = path.scope.generateUidIdentifier('new');
        return cpsExpr(expr.callee, f =>
          cpsExprList(expr.arguments, args =>
            k(tmp).map(c =>
              new CLet('const', tmp, new BNew(f, args), c)), ek, path), ek, path);
      case 'ObjectExpression':
        return cpsObjMembers(<t.ObjectMember[]>expr.properties,
          (mems: AExpr[][]) => {
            const obj = path.scope.generateUidIdentifier('obj');
            const fields = new Map();
            mems.forEach(function (item) {
              const [id, v] = item;
              fields.set(id, v);
            });
            return k(obj).map(c => new CLet('const', obj, new BObj(fields), c));
          },
          ek,
          path);
      case 'SequenceExpression':
        return cpsExprList(expr.expressions, (vs: AExpr[]) => {
          const seq = path.scope.generateUidIdentifier('seq');
          return k(seq).map(c => new CLet('const', seq, new BSeq(vs), c));
        }, ek, path);
      case 'ThisExpression':
        return k(new AtomicBExpr(new BThis()));
      case 'UpdateExpression': {
        const tmp = path.scope.generateUidIdentifier('update');
        return k(tmp).bind(c =>
          cpsExpr(expr.argument, (v: AExpr) =>
            ret<CExpr,CExpr>(new CLet('const', tmp,
              new BIncrDecr(expr.operator, v, expr.prefix), c)), ek, path));
      }
    }
    throw new Error(`${expr.type} not yet implemented`);
  }

function cpsStmt(stmt: t.Statement,
  k: (arg: AExpr) => CPS<CExpr,CExpr>,
  ek: (arg: AExpr) => CPS<CExpr,CExpr>,
  path: NodePath<t.Node>): CPS<CExpr,CExpr> {
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
        return cpsExpr(stmt.label, label =>
          ret<CExpr,CExpr>(new CAdminApp(label, [undefExpr])), ek, path);
      case "EmptyStatement":
        return k(undefExpr);
      case "ExpressionStatement":
        return cpsExpr(stmt.expression, _ =>
          k(undefExpr), ek, path);
      case "IfStatement":
        return cpsExpr(stmt.test, tst => {
          const cont = path.scope.generateUidIdentifier('if_cont');
          return k(cont).bind(if_cont =>
            cpsStmt(stmt.consequent, v => ret<CExpr,CExpr>(new CAdminApp(cont, [v])), ek, path)
            .bind(consequent =>
              cpsStmt(stmt.alternate, v => ret<CExpr,CExpr>(new CAdminApp(cont, [v])), ek, path)
              .map(alternate =>
                new CLet('const', cont, new BAdminFun(undefined, [cont], if_cont),
                  new ITE(tst, consequent, alternate)))));
        }, ek, path);
      case "LabeledStatement": {
        const kErr = path.scope.generateUidIdentifier('kErr');
        return cpsExpr(t.callExpression(t.memberExpression(
          t.functionExpression(undefined,
          [stmt.label, kErr], flatBodyStatement([stmt.body])), t.identifier('call')),
          [t.thisExpression()]), k, ek, path);
      }
      case "ReturnStatement":
        let returnK = (r: AExpr) =>
          ret<CExpr,CExpr>(new CAdminApp((<KArg<t.ReturnStatement>>stmt).kArg, [r]));
        return cpsExpr(stmt.argument, returnK, ek, path);
      case 'ThrowStatement':
        return cpsExpr(stmt.argument, ek, v =>
          ret<CExpr,CExpr>(new CAdminApp(v, [undefExpr])), path);
      case 'TryStatement':
        const kFun = path.scope.generateUidIdentifier('kFun');
        const kErr = path.scope.generateUidIdentifier('kErr');
        const fin = stmt.finalizer === null ?
          k : (v: AExpr) => cpsStmt(stmt.finalizer, k, ek, path);
        const err = stmt.handler === null ?
          ek : (e: AExpr) =>
          cpsStmt(stmt.handler.body, fin, ek, path).map(c =>
            new CLet('const', stmt.handler.param, new BAtom(e), c));
        return cpsExpr(t.callExpression(t.functionExpression(undefined,
          [kFun, kErr],
          stmt.block), []), fin, err, path);
      case "VariableDeclaration": {
        const { declarations } = stmt;
        const [head, ...tail] = declarations;
        if (head === undefined) {
          return k(undefExpr);
        } else if (tail === []) {
          return cpsExpr(head.init, v =>
            k(undefExpr).map(c => new CLet(stmt.kind, <t.Identifier>head.id, new BAtom(v), c)),
            ek, path);
        } else {
          return cpsExpr(head.init, v =>
            cpsStmt(t.variableDeclaration(stmt.kind, tail), k, ek, path).map(c =>
              new CLet(stmt.kind, <t.Identifier>head.id, new BAtom(v), c)),
            ek, path);
        }
      }
      default:
        throw new Error(`${stmt.type} not yet implemented`);
    }
  }

function generateLVal(lval: LVal, m: Map<string, string>): t.LVal {
  switch (lval.type) {
    case 'Identifier':
      return lval;
    case 'lval_member':
      return t.memberExpression(generateAExpr(lval.object, m),
        generateAExpr(lval.property, m), lval.computed);
    default:
      throw new Error(
        `Unexpected error: JS generation for LVal of typ ${lval.type} not yet implemented`);
  }
}

function renameId(x: t.Identifier, m: Map<string, string>): t.Identifier {
  const newX = m.get(x.name);
  if (newX !== undefined) {
    return renameId(t.identifier(newX), m);
  } else {
    return x;
  }
}

function generateAExpr(aexpr: AExpr, m: Map<string, string>): t.Expression {
  switch (aexpr.type) {
    case 'Identifier':
      return renameId(aexpr, m);
    case 'BooleanLiteral':
    case 'NumericLiteral':
    case 'StringLiteral':
    case 'NullLiteral':
    case 'RegExpLiteral':
    case 'TemplateLiteral':
      return aexpr;
    case 'atomic_bexpr':
      return generateBExpr(aexpr.bexpr, m);
  }
}

function generateAExprSpread(aexpr: AExpr | t.SpreadElement,
  m: Map<string, string>): t.Expression | t.SpreadElement {
    switch (aexpr.type) {
      case 'SpreadElement':
        return aexpr;
      default:
        return generateAExpr(aexpr, m);
    }
  }

function generateBExpr(bexpr: BExpr, m: Map<string, string>): t.Expression {
  switch (bexpr.type) {
    case 'atom':
      return generateAExpr(bexpr.atom, m);
    case 'BFun':
      return transformed(t.functionExpression(bexpr.id,
        bexpr.args,
        flatBodyStatement(generateJS(bexpr.body, m))));
    case 'BAdminFun':
      return t.arrowFunctionExpression(bexpr.args,
        flatBodyStatement(generateJS(bexpr.body, m)));
    case 'op2':
      return t.binaryExpression(bexpr.oper,
        generateAExpr(bexpr.l, m), generateAExpr(bexpr.r, m));
    case 'op1':
      return t.unaryExpression(bexpr.oper, generateAExpr(bexpr.v, m));
    case 'lop':
      return t.logicalExpression(bexpr.oper,
        generateAExpr(bexpr.l, m), generateAExpr(bexpr.r, m));
    case 'assign':
      return t.assignmentExpression(bexpr.operator,
        generateLVal(bexpr.x, m), generateAExpr(bexpr.v, m));
    case 'obj':
      const properties : t.ObjectProperty[] = [];
      bexpr.fields.forEach((value, key) =>
        properties.push(t.objectProperty(key, generateAExpr(value, m))));
      return t.objectExpression(properties);
    case 'get':
      return t.memberExpression(generateAExpr(bexpr.object, m),
        generateAExpr(bexpr.property, m), bexpr.computed);
    case 'incr/decr':
      return t.updateExpression(bexpr.operator,
        generateAExpr(bexpr.argument, m), bexpr.prefix);
    case 'arraylit':
      return t.arrayExpression(bexpr.arrayItems.map(x => generateAExpr(x, m)));
    case 'seq':
      return t.sequenceExpression(bexpr.elements.map(x => generateAExpr(x, m)));
    case 'this':
      return t.thisExpression();
    case 'new':
      return t.newExpression(generateAExpr(bexpr.f, m),
        bexpr.args.map(x => generateAExprSpread(x, m)));
    case 'update':
      throw new Error(`${bexpr.type} generation is not yet implemented`);
  }
}

function generateJS(cexpr: CExpr, m: Map<string, string>): t.Statement[] {
  switch (cexpr.type) {
    case 'app':
      return [t.returnStatement(t.callExpression(generateAExpr(cexpr.f, m),
        cexpr.args.map(x => generateAExprSpread(x, m))))];
    case 'callapp':
      return [t.returnStatement(call(t.callExpression(generateAExpr(cexpr.f, m),
        cexpr.args.map(x => generateAExprSpread(x, m)))))];
    case 'applyapp':
      return [t.returnStatement(apply(t.callExpression(generateAExpr(cexpr.f, m),
        cexpr.args.map(x => generateAExprSpread(x, m)))))];
    case 'adminapp':
      return [t.returnStatement(administrative(t.callExpression(generateAExpr(cexpr.f, m),
        cexpr.args.map(x => generateAExprSpread(x, m)))))];
    case 'ITE':
      return [t.ifStatement(generateAExpr(cexpr.e1, m),
        flatBodyStatement(generateJS(cexpr.e2, m)),
        flatBodyStatement(generateJS(cexpr.e3, m)))];
    case 'let':
      const decl = letExpression(cexpr.x, generateBExpr(cexpr.named, m), cexpr.kind);
      return [decl,
        ...generateJS(cexpr.body, m)];
  }
}

const cpsExpression : Visitor = {
  Program: {
    enter(path: NodePath<t.Program>): void {
      const { body } = path.node;
      const onDone = t.identifier('$onDone');
      const onError = t.identifier('$onError');

      const cexpr = cpsStmt(t.blockStatement(body),
        v => ret<CExpr,CExpr>(new CAdminApp(onDone, [v])),
        v => ret<CExpr,CExpr>(new CAdminApp(onError, [v])), path).apply(x => x);

      const { c, m } = inlineApplications(raiseFuns(cexpr));

      const kont =
        t.functionExpression(undefined, [onDone, onError],
          t.blockStatement(generateJS(c, m)));
      const kontCall = administrative(t.callExpression(kont, [onDone, onError]));

      path.node.body = [t.expressionStatement(kontCall)];
    }
  }
};

module.exports = function() {
  return { visitor: cpsExpression };
};
