import * as t from 'babel-types';

type AExpr = t.Identifier | t.Literal;

interface BExpr { }
interface CExpr { }

class BFun implements BExpr {
    kind: "BFun";
    args: t.Identifier[];
    body: CExpr;
}

function bfun(args: t.Identifier[], body: CExpr): BFun {
    return { kind: "BFun", args, body };
}

class BAtom implements BExpr {
    kind: "atom";
    atom: AExpr
}

class BOp2 implements BExpr {
    kind: "op2";
    name: String;
    v1: AExpr;
    v2: AExpr
}

class BOp1 implements BExpr {
    kind: "op1";
    name: String;
    v: AExpr;
}

class BAssign implements BExpr {
    kind: "assign";
    x: t.Identifier;
    v: AExpr;
}

class BObj implements BExpr {
    kind: "obj";
    fields: Map<String, AExpr>
}

class BArrayLit implements BExpr {
    kind: "arraylit";
    arrayItems: AExpr[];
}

class BGet implements BExpr {
    kind: "get";
    obj: AExpr;
    key: AExpr;
}

class BUpdate implements BExpr {
    kind: "update";
    obj: AExpr;
    key: AExpr;
    e: AExpr; 
}

class CApp implements CExpr {
    kind: "app";
    f: AExpr;
    args: AExpr[]
}

function capp(f: AExpr, args: AExpr[]): CExpr {
    return { kind: "app", f, args };
}

class ITE implements CExpr {
    kind: "ITE";
    e1: AExpr;
    e2: CExpr;
    e3: CExpr
}

// This is really letrec
class CLet implements CExpr {
    kind: "let";
    x: t.Identifier;
    named: BExpr;
    body: CExpr;
}

function clet(x: t.Identifier, named: BExpr, body: CExpr): CLet {
    return { kind: "let", x, named, body };
}

function cpsExprList(exprs: t.Expression[], k: (arg: AExpr[]) => CExpr): CExpr {
    if (exprs.length === 0) {
        return k([]);
    }
    else {
        const [ hd, ...tl ] = exprs;
        return cpsExpr(hd, v => cpsExprList(tl, vs => k([v, ...vs])));
    }
}

function mkLet(x: t.Identifier, named: BExpr, body: (x: t.Identifier) => CExpr): CExpr {
    return clet(x, named, body(x));
}

function tmpLet(named: BExpr, body: (x: t.Identifier) => CExpr): CExpr {
    const x = t.identifier("t");
    return clet(x, named, body(x));
}

const undefExpr: AExpr = t.identifier("undefined");

function cpsExpr(expr: t.Expression, k: (arg: AExpr) => CExpr): CExpr {
    switch (expr.type) {
    case "FunctionExpression":
        const sk = t.identifier("tmp");
        return tmpLet(bfun([sk, ...<t.Identifier[]>(expr.params)],
                           cpsStmt(expr.body, r => capp(sk, [undefExpr]))), k);
    case "CallExpression":
        return cpsExpr(expr.callee, f =>
                       cpsExprList(<t.Expression[]>(expr.arguments), args => {
                           let kFun = t.identifier("tmp");
                           let r = t.identifier("tmp");
                           return clet(kFun, bfun([r], k(r)),
                                       { kind: "app", f, args: [ kFun, ...args ] });
                       }));
    }
    throw "nyi";
}

function cpsStmt(stmt: t.Statement, k: (arg: AExpr) => CExpr): CExpr {
    switch (stmt.type) {
    case "EmptyStatement":
        return k(t.identifier("undefined"));
    case "ExpressionStatement":
        return cpsExpr(stmt.expression, _ => k(t.identifier("undefined")));
    case "ReturnStatement":
        cpsExpr(stmt.argument, r => k(r));
    default:
        throw "missing case";
    }
}

