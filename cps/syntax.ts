export {
  Expr, Var , Fun , App , Assign , ITE , Throw , Try , Seq , Let
}

type Expr = Var | Fun | App | Assign | ITE | Throw | Try | Seq | Let

type Id = string

class Var {
  x: Id;
  type = "Var";
  constructor (x: Id) {
    this.x = x;
  }
}

class Fun {
  name: string;
  args: Id[];
  body: Expr;
  type = "Fun";
  constructor(name: string, args: Id[], body: Expr) {
    this.name = name;
    this.args = args;
    this.body = body;
  }
}

class App {
  e1: Expr;
  e2: Expr;
  type = "App";
  constructor(e1: Expr, e2: Expr) {
    this.e1 = e1;
    this.e2 = e2;
  }
}

class Assign {
  x: Id;
  e: Expr;
  type = "Assign"
  constructor(x: Id, e: Expr) {
    this.x = x;
    this.e = e;
  }
}

class ITE {
  pred: Expr;
  cons: Expr;
  alt: Expr;
  type = "ITE"
  constructor(pred: Expr, cons: Expr, alt: Expr) {
    this.pred = pred;
    this.cons = cons;
    this.alt = alt;
  }
}

class Throw {
  e: Expr;
  type = "Throw"
  constructor(e: Expr) {
    this.e = e;
  }
}

class Try {
  e: Expr;
  catchBind: string;
  catchHandler: Expr;
  type = "Try"
  constructor(e: Expr, catchBind: string, catchHandler: Expr) {
    this.e = e;
    this.catchBind = catchBind;
    this.catchHandler = catchHandler;
  }
}

class Seq {
  es: Expr[]
  type = "Seq"
  constructor(es: Expr[]) {
    this.es = es;
  }
}

class Let {
  binds: Array<[Id, Expr]>;
  body: Expr;
  type = "Let"
  constructor(binds: Array<[Id, Expr]>, body: Expr) {
    this.binds = binds;
    this.body = body;
  }
}
