import * as t from 'babel-types';

import { AExpr, BExpr, CExpr, AtomicBExpr, BAtom, BFun, BAdminFun, CApp,
  CAdminApp, CCallApp, CApplyApp, ITE, CLet }
from './cexpr';
import {CPS, ret} from './cpsMonad';
import {FVSet, fvSetOfArray, copyFVSet, diff, intersect, empty}
from '../common/helpers';

type T = {
  body: CExpr,
  funs: { id: t.Identifier, f: BAtom | BFun | BAdminFun }[],
}

type I = {
  c: CExpr,
  m: Map<string, string>,
}

function bindFuns(x: T): CExpr {
  const { body, funs } = x;
  return funs.reduceRight(function(a, b) {
    const { id, f } = b;
    return new CLet('const', id, f, a);
  }, body);
}

export function raiseFuns(expr: CExpr): CExpr {
  function crec(locals: FVSet<string>, cexpr: CExpr): CPS<T,CExpr> {
    function brecFun(locals: FVSet<string>,
      ctor: any,
      named: BFun | BAdminFun,
      cexpr: CLet): CPS<T,CExpr> {
        return crec(fvSetOfArray(named.args.map(x => x.name)).add(cexpr.x.name), named.body).bind(a =>
          crec(copyFVSet(locals).add(cexpr.x.name), cexpr.body).map(b => {
            const { body, funs: funsF } = a;
            const { body: c, funs: funsL } = b;
              if (intersect(diff(named.body.freeVars,
                fvSetOfArray(named.args.map(x => x.name)).add(cexpr.x.name)),
                locals).size === 0) {
                return {
                  body: c,
                  funs: [
                    {
                      id: cexpr.x,
                      f: new ctor(named.id, named.args, body)
                    },
                    ...funsF,
                    ...funsL
                  ]
                };
              } else {
                return {
                  body: new CLet(cexpr.kind, cexpr.x,
                    new ctor(named.id, named.args, bindFuns({ body, funs: funsF })),
                    c),
                  funs: funsL
                };
              }
          }));
      }

    function crecDefault(locals: FVSet<string>, cexpr: CLet): CPS<T,CExpr> {
      return crec(copyFVSet(locals).add(cexpr.x.name), cexpr.body).map(a => {
        const { body, funs } = a;
        return {
          body: new CLet(cexpr.kind, cexpr.x, cexpr.named, body),
          funs: funs
        };
      });
    }

    switch (cexpr.type) {
      case 'let': {
        const named = cexpr.named;
        switch (named.type) {
          case 'BFun':
            return brecFun(locals, BFun, named, cexpr);
          case 'BAdminFun':
            return brecFun(locals, BAdminFun, named, cexpr);
          case 'atom': {
            switch (named.atom.type) {
              case 'atomic_bexpr':
                switch (named.atom.bexpr.type) {
                  case 'BFun':
                    return brecFun(locals, BFun, named.atom.bexpr, cexpr);
                  case 'BAdminFun':
                    return brecFun(locals, BAdminFun, named.atom.bexpr, cexpr);
                  default:
                    return crecDefault(locals, cexpr);
                }
              default:
                return crecDefault(locals, cexpr);
            }
          }
          default:
            return crecDefault(locals, cexpr);
        }
      }
      case 'ITE': {
        return crec(locals, cexpr.e2).bind(a =>
          crec(locals, cexpr.e3).map(b => {
            const { body: cT, funs: funsT } = a;
            const { body: cF, funs: funsF } = b;
            return {
              body: new ITE(cexpr.e1, cT, cF),
              funs: [...funsT, ...funsF]
            };
          }));
      }
      default:
        return ret<T,CExpr>({
          body: cexpr,
          funs: []
        });
    }
  }

  return crec(empty<string>(), expr).map((c: T) => bindFuns(c)).apply(x => x);
}


export function inlineApplications(expr: CExpr): I {
  const indirectToDirect: Map<string, string> = new Map();

  function brecFun(f: BAdminFun, cexpr: CLet): CExpr {
    const funBody = f.body;
    switch (funBody.type) {
      case 'adminapp':
        const { f: fApp, args: argsApp } = funBody;
        if (argsApp.length === 1 &&
          t.isIdentifier(argsApp[0]) &&
          (<t.Identifier>argsApp[0]).name === f.args[0].name) {
          indirectToDirect.set(cexpr.x.name, (<t.Identifier>fApp).name);
          return crec(cexpr.body);
        }
        return new CLet(cexpr.kind, cexpr.x,
          new BAdminFun(f.id, f.args, crec(f.body)), crec(cexpr.body));
      default:
        return new CLet(cexpr.kind, cexpr.x,
          new BAdminFun(f.id, f.args, crec(f.body)), crec(cexpr.body));
    }
  }

  function crec(cexpr: CExpr): CExpr {
    switch (cexpr.type) {
      case 'let':
        const named = cexpr.named;
        switch (named.type) {
          case 'BAdminFun':
            return brecFun(named, cexpr);
          case 'BFun':
            return new CLet(cexpr.kind, cexpr.x, new BFun(named.id, named.args,
              crec(named.body)), crec(cexpr.body));
          default:
            return new CLet(cexpr.kind, cexpr.x, named, crec(cexpr.body));
        }
      case 'ITE':
        return new ITE(cexpr.e1, crec(cexpr.e2), crec(cexpr.e3));
      default:
        return cexpr;
    }
  }

  const c = crec(expr);
  return { c, m: indirectToDirect };
}
