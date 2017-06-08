import * as t from 'babel-types';

export type binop = "+" | "-" | "/" | "%" | "*" | "**" | "&" | "|" | ">>" | ">>>" |
  "<<" | "^" | "==" | "===" | "!=" | "!==" | "in" | "instanceof" | ">" |
  "<" | ">=" | "<=";

export type unop = "-" | "+" | "!" | "~" | "typeof" | "void" | "delete";

export type kind = 'const' | 'var' | 'let' | undefined;

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

export class Node {
  start: number;
  end: number;
  loc: t.SourceLocation;

  constructor() {
    this.start = 0;
    this.end = 0;
    this.loc = nullLoc;
  }
}

export type AExpr = t.Identifier | t.Literal;

export class BFun extends Node {
  type: 'BFun';

  constructor(public id: t.Identifier | undefined,
    public args: t.Identifier[],
    public body: CExpr) {
    super();
    this.type = 'BFun';
  }
}

export class BAdminFun extends Node {
  type: 'BAdminFun';

  constructor(public id: t.Identifier | undefined,
    public args: t.Identifier[],
    public body: CExpr) {
    super();
    this.type = 'BAdminFun';
  }
}

export class BAtom extends Node {
  type: 'atom';

  constructor(public atom: AExpr) {
    super();
    this.type = 'atom';
  }
}

export class BOp2 extends Node {
  type: 'op2';

  constructor(public name: binop,
    public l: AExpr,
    public r: AExpr) {
    super();
    this.type = 'op2';
  }
}

export class BOp1 extends Node {
  type: 'op1';

  constructor(public name: unop, public v: AExpr) {
    super();
    this.type = 'op1';
  }
}

export class BLOp extends Node {
  type: 'lop';

  constructor(public name: '||' | '&&',
    public l: AExpr,
    public r: AExpr) {
    super();
    this.type = 'lop';
  }
}

export class BAssign extends Node {
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
export class BObj extends Node {
  type: 'obj';

  constructor(public fields: Map<AExpr, AExpr>) {
    super();
    this.type = 'obj';
  }
}

export class BArrayLit extends Node {
  type: 'arraylit';

  constructor(public arrayItems: AExpr[]) {
    super();
    this.type = 'arraylit';
  }
}

export class BGet extends Node {
  type: 'get';

  constructor(public object: AExpr, public  property: AExpr, public computed: boolean) {
    super();
    this.type = 'get';
  }
}


export class BIncrDecr extends Node {
  type: 'incr/decr';

  constructor(public operator: '++' | '--',
    public argument: AExpr,
    public prefix: boolean) {
    super();
    this.type = 'incr/decr';
  }
}

export class BUpdate extends Node {
  type: 'update';

  constructor(public obj: AExpr,
    public key: AExpr,
    public e: AExpr) {
    super();
    this.type = 'update';
  }
}

export class BSeq extends Node {
  type: 'seq';

  constructor(public elements: AExpr[]) {
    super();
    this.type = 'seq';
  }
}

export class BThis extends Node {
  type: 'this';

  constructor() {
    super();
    this.type = 'this';
  }
}

export type BExpr =
  BFun | BAdminFun | BAtom | BOp2 | BOp1 | BLOp | BAssign | BObj | BArrayLit | BGet | BIncrDecr
  | BUpdate | BSeq | BThis | t.NewExpression | t.ConditionalExpression

export class CApp extends Node {
  type: 'app';

  constructor(public f: AExpr, public args: (AExpr | t.SpreadElement)[]) {
    super();
    this.type = 'app';
  }
}

export class CCallApp extends Node {
  type: 'callapp';

  constructor(public f: t.Expression, public args: (AExpr | t.SpreadElement)[]) {
    super();
    this.type = 'callapp';
  }
}

export class CApplyApp extends Node {
  type: 'applyapp';

  constructor(public f: t.Expression, public args: (AExpr | t.SpreadElement)[]) {
    super();
    this.type = 'applyapp';
  }
}

export class CAdminApp extends Node {
  type: 'adminapp';

  constructor(public f: AExpr, public args: (AExpr | t.SpreadElement)[]) {
    super();
    this.type = 'adminapp';
  }
}

export class ITE extends Node {
  type: 'ITE';

  constructor(public e1: AExpr,
    public e2: CExpr,
    public e3: CExpr) {
    super();
    this.type = 'ITE';
  }
}

// This is really letrec
export class CLet extends Node {
  type: 'let';

  constructor(public kind: kind,
    public x: t.Identifier,
    public named: BExpr,
    public body: CExpr) {
    super();
    this.type = 'let';
  }

}

export type CExpr = CLet | ITE | CApp | CCallApp | CApplyApp | CAdminApp;
