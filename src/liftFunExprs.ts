import * as t from 'babel-types';

import {
  AExpr, BExpr, CExpr, Node, BFun, BAdminFun, BAtom, BOp2, BOp1, BLOp,
  BAssign, BObj, BArrayLit, BGet, BIncrDecr, BUpdate, BSeq, BThis, CApp,
  CCallApp, CApplyApp, CAdminApp, ITE, CLet
} from './cexpr';
import {CPS, ret} from './cpsMonad';
import {diff, intersect} from './helpers';

type T = {
  body: CExpr,
  funs: { id: t.Identifier, f: BFun }[],
}

function bindFuns(x: T): CExpr {
  const { body, funs } = x;
  return funs.reduceRight(function(a, b) {
    const { id, f } = b;
    return new CLet('const', id, f, a);
  }, body);
}

export function raiseFuns(expr: CExpr): CExpr {
  function crec(locals: Set<t.Identifier>, cexpr: CExpr): T {
    switch (cexpr.type) {
      case 'let': {
        const named = cexpr.named;
        switch (named.type) { 
          case 'BFun': {
            const { body, funs: funsF } = crec(new Set(named.args).add(cexpr.x), named.body);
            const { body: c, funs: funsL } = crec(new Set(locals).add(cexpr.x), cexpr.body);
            if (intersect(diff(body.freeVars, new Set(named.args).add(cexpr.x)), locals).size === 0) {
              return {
                body: c,
                funs: [
                  {
                    id: cexpr.x,
                    f: new BFun(named.id, named.args, body)
                  },
                  ...funsF,
                  ...funsL
                ]
              };
            } else {
              return {
                body: new CLet(cexpr.kind, cexpr.x,
                  new BFun(named.id, named.args, bindFuns({ body: body, funs: funsF })),
                  c),
                funs: funsL
              };
            }
          }
          default:
            const { body, funs } = crec(new Set(locals).add(cexpr.x), cexpr.body);
            return {
              body: new CLet(cexpr.kind, cexpr.x, cexpr.named, cexpr.body),
              funs: funs
            };
        }
      }
      case 'ITE': {
        const { body: cT, funs: funsT } = crec(locals, cexpr.e2);
        const { body: cF, funs: funsF } = crec(locals, cexpr.e3);
        return {
          body: new ITE(cexpr.e1, cT, cF),
          funs: [...funsT, ...funsF]
        };
      }
      default:
        return {
          body: cexpr,
          funs: []
        };
    }
  }
  
  return bindFuns(crec(new Set(), expr));
}
