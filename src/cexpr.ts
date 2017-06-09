import * as t from 'babel-types';
import {diff, union} from './helpers';

export type binop = "+" | "-" | "/" | "%" | "*" | "**" | "&" | "|" | ">>" | ">>>" |
  "<<" | "^" | "==" | "===" | "!=" | "!==" | "in" | "instanceof" | ">" |
  "<" | ">=" | "<=";

export type unop = "-" | "+" | "!" | "~" | "typeof" | "void" | "delete";

export type kind = 'const' | 'var' | 'let' | undefined;

export type FreeVars<T> = T & {
  freeVars: Set<t.Identifier>;
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
  freeVars: Set<t.Identifier>;

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

function fvs(a: AExpr | t.SpreadElement): Set<t.Identifier> {
  if (t.isIdentifier(a)) {
    return new Set([a]);
  } else if (t.isLiteral(a)) {
    return new Set();
  } else if (t.isSpreadElement(a)) {
    if (t.isIdentifier(a) || t.isLiteral(a)) {
      return fvs(a);
    } else {
      return new Set();
    }
  }

  // unreachable
  return new Set();
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
    this.freeVars = diff(this.body.freeVars, new Set(this.args));
    this.freeVars.delete(t.identifier('arguments'));
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
    this.freeVars = diff(this.body.freeVars, new Set(this.args));
    this.freeVars.delete(t.identifier('arguments'));
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
  x: t.LVal;
  v: AExpr;

  constructor(operator: string, x: t.LVal, v: AExpr) {
    super(operator, x, v);
    this.type = 'assign';
  }

  init(operator: string, x: t.LVal, v: AExpr): void {
    this.operator = operator;
    this.x = x;
    this.v = v;
  }
  
  fvs(): void {
    this.freeVars = new Set(fvs(this.v));
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
    this.freeVars = new Set();
    this.arrayItems.forEach((x: AExpr) => this.freeVars = union(this.freeVars, fvs(x)));
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
    this.freeVars = new Set();
    this.elements.forEach((x: AExpr) => union(this.freeVars, fvs(x)));
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
    this.freeVars = new Set();
  }
}

/*
export class BCond extends Node {
  type: 'conditional';
  test: BExpr;
  consequent: BExpr;
  alternate: BExpr;
  
  constructor(test: BExpr, consequent: BExpr, alternate: BExpr) {
    super(test, consequent, alternate);
    this.type = 'conditional';
  }

  init(test: BExpr, consequent: BExpr, alternate: BExpr): void {
    this.test = test;
    this.consequent = consequent;
    this.alternate = alternate;
  }
  
  fvs(): void {
    this.freeVars = union(this.test.freeVars,
      union(this.consequent.freeVars, this.alternate.freeVars));
  }
}
*/

export type BExpr =
  BFun | BAdminFun | BAtom | BOp2 | BOp1 | BLOp | BAssign | BGet | BObj |
  BArrayLit | BIncrDecr | BUpdate | BSeq | BThis | BNew |
  FreeVars<t.ConditionalExpression>

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
    this.freeVars = new Set();
    this.args.forEach((x: AExpr) => union(this.freeVars, fvs(x)));
    this.freeVars = union(this.freeVars, fvs(this.f));
  }
}

export class CCallApp extends Node {
  type: 'callapp';
  f: t.Expression;
  args: (AExpr | t.SpreadElement)[];

  constructor(f: t.Expression, args: (AExpr | t.SpreadElement)[]) {
    super(f, args);
    this.type = 'callapp';
  }

  init(f: t.Expression, args: (AExpr | t.SpreadElement)[]): void {
    this.f = f;
    this.args = args;
  }
  
  fvs(): void {
    this.freeVars = new Set();
    this.args.forEach((x: AExpr) => union(this.freeVars, fvs(x)));
    //TODO: this.freeVars = union(this.freeVars, fvs(this.f));
  }
}

export class CApplyApp extends Node {
  type: 'applyapp';
  f: t.Expression;
  args: (AExpr | t.SpreadElement)[];

  constructor(f: t.Expression, args: (AExpr | t.SpreadElement)[]) {
    super(f, args);
    this.type = 'applyapp';
  }
  
  init(f: t.Expression, args: (AExpr | t.SpreadElement)[]): void {
    this.f = f;
    this.args = args;
  }

  fvs(): void {
    this.freeVars = new Set();
    this.args.forEach((x: AExpr) => union(this.freeVars, fvs(x)));
    //TODO: this.freeVars = union(this.freeVars, fvs(this.f));
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
    this.freeVars = new Set();
    this.args.forEach((x: AExpr | t.SpreadElement) => union(this.freeVars, fvs(x)));
    this.freeVars = union(this.freeVars, fvs(this.f));
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
    this.freeVars = union(this.named.freeVars, diff(this.body.freeVars, new Set([this.x])));
  }
}

export type CExpr = CLet | ITE | CApp | CCallApp | CApplyApp | CAdminApp;
