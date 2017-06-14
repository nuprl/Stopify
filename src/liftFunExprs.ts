import * as t from 'babel-types';

import { CExpr, AtomicBExpr, BAtom, BFun, BAdminFun, ITE, CLet } from './cexpr';
import {CPS, ret} from './cpsMonad';
import {diff, intersect} from './helpers';

type T = {
  body: CExpr,
  funs: { id: t.Identifier, f: BAtom | BFun | BAdminFun }[],
}

function bindFuns(x: T): CExpr {
  const { body, funs } = x;
  return funs.reduceRight(function(a, b) {
    const { id, f } = b;
    return new CLet('const', id, f, a);
  }, body);
}

export function raiseFuns(expr: CExpr): CExpr {
  function crec(locals: Set<string>, cexpr: CExpr): CPS<T,CExpr> {
    function crecFun(locals: Set<string>,
      ctor: any,
      named: BFun | BAdminFun,
      cexpr: CLet): CPS<T,CExpr> {
        return crec(new Set(named.args.map(x => x.name)).add(cexpr.x.name), named.body).bind(a =>
          crec(new Set(locals).add(cexpr.x.name), cexpr.body).map(b => {
            const { body, funs: funsF } = a;
            const { body: c, funs: funsL } = b;
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
          }));
      }

    function crecDefault(locals: Set<string>, cexpr: CLet): CPS<T,CExpr> {
      return crec(new Set(locals).add(cexpr.x.name), cexpr.body).map(a => {
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
            return crecFun(locals, BFun, named, cexpr);
          case 'BAdminFun':
            return crecFun(locals, BAdminFun, named, cexpr);
          case 'atom': {
            switch (named.atom.type) {
              case 'atomic_bexpr':
                switch (named.atom.bexpr.type) {
                  case 'BFun':
                    return crecFun(locals, BFun, named.atom.bexpr, cexpr);
                  case 'BAdminFun':
                    return crecFun(locals, BAdminFun, named.atom.bexpr, cexpr);
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

  return crec(new Set(), expr).map((c: T) => bindFuns(c)).apply(x => x);
}
