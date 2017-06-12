import * as t from 'babel-types';
import {diff, union} from './helpers';

export type binop = "+" | "-" | "/" | "%" | "*" | "**" | "&" | "|" | ">>" | ">>>" |
  "<<" | "^" | "==" | "===" | "!=" | "!==" | "in" | "instanceof" | ">" |
  "<" | ">=" | "<=";

export type unop = "-" | "+" | "!" | "~" | "typeof" | "void" | "delete";

export type kind = 'const' | 'var' | 'let' | undefined;

export type FreeVars<T> = T & {
  freeVars: Set<string>;
}

export const nullLoc : any  = {
  start: {
    line: null,
    column: null,
  },
  end: {
    line: null,
    column: null,
  },
};

export abstract class Node {
  start: number;
  end: number;
  loc: t.SourceLocation;
  freeVars: Set<string>;

  abstract init(...args: any[]): void;
  abstract fvs(): void;

  constructor(...args: any[]) {
    this.start = 0;
    this.end = 0;
    this.loc = nullLoc;
    this.init(...args);
    this.fvs();
  }
}

export type AExpr = t.Identifier | t.Literal;

export class LValMember extends Node {
  type: 'lval_member';
  object: AExpr;
  property: AExpr;
  computed: boolean;

  constructor(object: AExpr,  property: AExpr, computed: boolean) {
    super(object, property, computed);
    this.type = 'lval_member';
  }

  init(object: AExpr,  property: AExpr, computed: boolean): void {
    this.object = object;
    this.property = property;
    this.computed = computed;
  }

  fvs(): void {
    this.freeVars = union(fvs(this.object), fvs(this.property));
  }
}

export type LVal = AExpr | LValMember

export function fvs(a: LVal | t.SpreadElement): Set<string> {
  if (t.isIdentifier(a)) {
    return new Set([a.name]);
  } else if (t.isLiteral(a)) {
    return new Set();
  } else if (t.isSpreadElement(a)) {
    if (t.isIdentifier(a.argument) || t.isLiteral(a.argument)) {
      return fvs(a.argument);
    } else {
      return new Set();
    }
  } else if (a.type === 'lval_member') {
    return a.freeVars;
  }

  // unreachable
  return new Set();
}

export function withFVs(l: t.LVal): FreeVars<t.LVal> {
  if (t.isIdentifier(l)) {
    const r : any = l;
    r.freeVars = new Set([l.name]);
    return r;
  } else {
    const r : any = l;
    r.freeVars = new Set();
    return r;
  }
}

export class BFun extends Node {
  type: 'BFun';
  id: t.Identifier | undefined;
  args: t.Identifier[];
  body: CExpr;

  constructor(id: t.Identifier | undefined, args: t.Identifier[], body: CExpr) {
    super(id, args, body);
    this.type = 'BFun';
  }

  init(id: t.Identifier | undefined, args: t.Identifier[], body: CExpr): void {
    this.id = id;
    this.args = args;
    this.body = body;
  }

  fvs(): void {
    this.freeVars = diff(this.body.freeVars, new Set(this.args.map(x => x.name)));
    this.freeVars.delete('arguments');
  }
}

export class BAdminFun extends Node {
  type: 'BAdminFun';
  id: t.Identifier | undefined;
  args: t.Identifier[];
  body: CExpr;

  constructor(id: t.Identifier | undefined, args: t.Identifier[], body: CExpr) {
    super(id, args, body);
    this.type = 'BAdminFun';
  }

  init(id: t.Identifier | undefined, args: t.Identifier[], body: CExpr): void {
    this.id = id;
    this.args = args;
    this.body = body;
  }

  fvs(): void {
    this.freeVars = diff(this.body.freeVars, new Set(this.args.map(x => x.name)));
    this.freeVars.delete('arguments');
  }
}

export class BAtom extends Node {
  type: 'atom';
  atom: AExpr;

  constructor(atom: AExpr) {
    super(atom);
    this.type = 'atom';
  }

  init(atom: AExpr): void {
    this.atom = atom;
  }

  fvs(): void {
    this.freeVars = fvs(this.atom);
  }
}

export class BOp2 extends Node {
  type: 'op2';
  oper: binop;
  l: AExpr;
  r: AExpr;

  constructor(oper: binop, l: AExpr, r: AExpr) {
    super(oper, l, r);
    this.type = 'op2';
  }

  init(oper: binop, l: AExpr, r: AExpr): void {
    this.oper = oper;
    this.l = l;
    this.r = r;
  }

  fvs(): void {
    this.freeVars = union(fvs(this.l), fvs(this.r));
  }
}

export class BOp1 extends Node {
  type: 'op1';
  oper: unop;
  v: AExpr;

  constructor(oper: unop, v: AExpr) {
    super(oper, v);
    this.type = 'op1';
  }

  init(oper: unop, v: AExpr) {
    this.oper = oper;
    this.v = v;
  }

  fvs(): void {
    this.freeVars = fvs(this.v);
  }
}

export class BLOp extends Node {
  type: 'lop';
  oper: '||' | '&&';
  l: AExpr;
  r: AExpr;

  constructor(oper: '||' | '&&', l: AExpr, r: AExpr) {
    super(oper, l, r);
    this.type = 'lop';
  }

  init(oper: '||' | '&&', l: AExpr, r: AExpr): void {
    this.oper = oper;
    this.l = l;
    this.r = r;
  }

  fvs(): void {
    this.freeVars = union(fvs(this.l), fvs(this.r));
  }
}

export class BAssign extends Node {
  type: 'assign';
  operator: string;
  x: LVal;
  v: AExpr;

  constructor(operator: string, x: LVal, v: AExpr) {
    super(operator, x, v);
    this.type = 'assign';
  }

  init(operator: string, x: AExpr, v: AExpr): void {
    this.operator = operator;
    this.x = x;
    this.v = v;
  }

  fvs(): void {
    this.freeVars = union(fvs(this.x), fvs(this.v));
  }
}

export class BGet extends Node {
  type: 'get';
  object: AExpr;
  property: AExpr;
  computed: boolean;

  constructor(object: AExpr,  property: AExpr, computed: boolean) {
    super(object, property, computed);
    this.type = 'get';
  }

  init(object: AExpr,  property: AExpr, computed: boolean): void {
    this.object = object;
    this.property = property;
    this.computed = computed;
  }

  fvs(): void {
    this.freeVars = union(fvs(this.object), fvs(this.property));
  }
}

// TODO(sbaxter): Object literals need to track whether property keys are
// computed for proper JS generation:
//
// const obj = {
//   ['foo' + 9000]: val,
// }
export class BObj extends Node {
  type: 'obj';
  fields: Map<AExpr, AExpr>;

  constructor(fields: Map<AExpr, AExpr>) {
    super(fields);
    this.type = 'obj';
  }

  init(fields: Map<AExpr, AExpr>): void {
    this.fields = fields;
  }

  fvs(): void {
    this.freeVars = new Set();
    this.fields.forEach((v: AExpr) => this.freeVars = union(this.freeVars, fvs(v)));
  }
}

export class BArrayLit extends Node {
  type: 'arraylit';
  arrayItems: AExpr[];

  constructor(arrayItems: AExpr[]) {
    super(arrayItems);
    this.type = 'arraylit';
  }

  init(arrayItems: AExpr[]): void {
    this.arrayItems = arrayItems;
  }

  fvs(): void {
    this.freeVars = this.arrayItems.map(x => fvs(x))
    .reduce((a, b) => union(a, b), new Set());
  }
}

export class BIncrDecr extends Node {
  type: 'incr/decr';
  operator: '++' | '--';
  argument: AExpr;
  prefix: boolean;

  constructor(operator: '++' | '--', argument: AExpr, prefix: boolean) {
    super(operator, argument, prefix);
    this.type = 'incr/decr';
  }

  init(operator: '++' | '--', argument: AExpr, prefix: boolean): void {
    this.operator = operator;
    this.argument = argument;
    this.prefix = prefix;
  }

  fvs(): void {
    this.freeVars = fvs(this.argument);
  }
}

export class BUpdate extends Node {
  type: 'update';
  obj: AExpr;
  key: AExpr;
  e: AExpr;

  constructor(obj: AExpr, key: AExpr, e: AExpr) {
    super(obj, key, e);
    this.type = 'update';
  }

  init(obj: AExpr, key: AExpr, e: AExpr): void {
    this.obj = obj;
    this.key = key;
    this.e = e;
  }

  fvs(): void {
    this.freeVars = union(fvs(this.obj), union(fvs(this.key), fvs(this.e)));
  }
}

export class BSeq extends Node {
  type: 'seq';
  elements: AExpr[];

  constructor(elements: AExpr[]) {
    super(elements);
    this.type = 'seq';
  }

  init(elements: AExpr[]): void {
    this.elements = elements;
  }

  fvs(): void {
    this.freeVars = this.elements.map(x => fvs(x))
    .reduce((a, b) => union(a, b), new Set());
  }
}

export class BThis extends Node {
  type: 'this';

  constructor() {
    super();
    this.type = 'this';
  }

  init(): void {}

  fvs(): void {
    this.freeVars = new Set();
  }
}

export class BNew extends Node {
  type: 'new';
  f: AExpr;
  args: (AExpr | t.SpreadElement)[];

  constructor(f: AExpr, args: (AExpr | t.SpreadElement)[]) {
    super(f, args);
    this.type = 'new';
  }

  init(f: AExpr, args: (AExpr | t.SpreadElement)[]): void {
    this.f = f;
    this.args = args;
  }

  fvs(): void {
    this.freeVars = this.args.map(x => fvs(x))
    .reduce((a, b) => union(a, b), fvs(this.f));
  }
}

export type BExpr =
  BFun | BAdminFun | BAtom | BOp2 | BOp1 | BLOp | BAssign | BGet | BObj |
  BArrayLit | BIncrDecr | BUpdate | BSeq | BThis | BNew

export class CApp extends Node {
  type: 'app';
  f: AExpr;
  args: (AExpr | t.SpreadElement)[];

  constructor(f: AExpr, args: (AExpr | t.SpreadElement)[]) {
    super(f, args);
    this.type = 'app';
  }

  init(f: AExpr, args: (AExpr | t.SpreadElement)[]): void {
    this.f = f;
    this.args = args;
  }

  fvs(): void {
    this.freeVars = union(this.args.map(x => fvs(x))
      .reduce((a, b) => union(a, b), new Set()), fvs(this.f));
  }
}

export class CCallApp extends Node {
  type: 'callapp';
  f: AExpr;
  args: (AExpr | t.SpreadElement)[];

  constructor(f: AExpr, args: (AExpr | t.SpreadElement)[]) {
    super(f, args);
    this.type = 'callapp';
  }

  init(f: AExpr, args: (AExpr | t.SpreadElement)[]): void {
    this.f = f;
    this.args = args;
  }

  fvs(): void {
    this.freeVars = this.args.map(x => fvs(x))
    .reduce((a, b) => union(a, b), fvs(this.f));
  }
}

export class CApplyApp extends Node {
  type: 'applyapp';
  f: AExpr;
  args: (AExpr | t.SpreadElement)[];

  constructor(f: AExpr, args: (AExpr | t.SpreadElement)[]) {
    super(f, args);
    this.type = 'applyapp';
  }

  init(f: AExpr, args: (AExpr | t.SpreadElement)[]): void {
    this.f = f;
    this.args = args;
  }

  fvs(): void {
    this.freeVars = this.args.map(x => fvs(x))
    .reduce((a, b) => union(a, b), fvs(this.f));
  }
}

export class CAdminApp extends Node {
  type: 'adminapp';
  f: AExpr;
  args: (AExpr | t.SpreadElement)[];

  constructor(f: AExpr, args: (AExpr | t.SpreadElement)[]) {
    super(f, args);
    this.type = 'adminapp';
  }

  init(f: AExpr, args: (AExpr | t.SpreadElement)[]): void {
    this.f = f;
    this.args = args;
  }

  fvs(): void {
    this.freeVars = this.args.map(x => fvs(x))
    .reduce((a, b) => union(a, b), fvs(this.f));
  }
}

export class ITE extends Node {
  type: 'ITE';
  e1: AExpr;
  e2: CExpr;
  e3: CExpr;

  constructor(e1: AExpr, e2: CExpr, e3: CExpr) {
    super(e1, e2, e3);
    this.type = 'ITE';
  }

  init(e1: AExpr, e2: CExpr, e3: CExpr): void {
    this.e1 = e1;
    this.e2 = e2;
    this.e3 = e3;
  }

  fvs(): void {
    this.freeVars = union(fvs(this.e1), union(this.e2.freeVars, this.e3.freeVars));
  }
}

// This is really letrec
export class CLet extends Node {
  type: 'let';
  kind: kind;
  x: t.Identifier;
  named: BExpr;
  body: CExpr;

  constructor(kind: kind, x: t.Identifier, named: BExpr, body: CExpr) {
    super(kind, x, named, body);
    this.type = 'let';
  }

  init(kind: kind, x: t.Identifier, named: BExpr, body: CExpr): void {
    this.kind = kind;
    this.x = x;
    this.named = named;
    this.body = body;
  }

  fvs(): void {
    this.freeVars = union(this.named.freeVars, diff(this.body.freeVars, new Set([this.x.name])));
  }
}

export type CExpr = CLet | ITE | CApp | CCallApp | CApplyApp | CAdminApp;
