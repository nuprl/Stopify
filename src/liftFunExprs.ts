import * as t from 'babel-types';

import { CExpr, BFun, BAdminFun, ITE, CLet } from './cexpr';
import {CPS, ret} from './cpsMonad';
import {diff, intersect} from './helpers';

type T = {
  body: CExpr,
  funs: { id: t.Identifier, f: BFun | BAdminFun }[],
}

function bindFuns(x: T): CExpr {
  const { body, funs } = x;
  return funs.reduceRight(function(a, b) {
    const { id, f } = b;
    return new CLet('const', id, f, a);
  }, body);
}

export function raiseFuns(expr: CExpr): CExpr {
  function crec(locals: Set<string>, cexpr: CExpr): T {
    function crecFun(locals: Set<string>,
      ctor: any,
      named: BFun | BAdminFun,
      cexpr: CLet): T {
        const { body, funs: funsF } =
          crec(new Set(named.args.map(x => x.name)).add(cexpr.x.name), named.body);
        const { body: c, funs: funsL } =
          crec(new Set(locals).add(cexpr.x.name), cexpr.body);
        if (intersect(diff(named.body.freeVars,
          new Set(named.args.map(x => x.name)).add(cexpr.x.name)),
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
      }
    switch (cexpr.type) {
      case 'let': {
        const named = cexpr.named;
        switch (named.type) { 
          case 'BFun':
            return crecFun(locals, BFun, named, cexpr);
          case 'BAdminFun':
            return crecFun(locals, BAdminFun, named, cexpr);
          default:
            const { body, funs } = crec(new Set(locals).add(cexpr.x.name), cexpr.body);
            return {
              body: new CLet(cexpr.kind, cexpr.x, cexpr.named, body),
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
