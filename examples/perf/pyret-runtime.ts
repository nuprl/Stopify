const initialGas: number = 100;
let GAS: number = initialGas;

export function decrGAS(): number {
  return --GAS;
}

export class ContinuationExn {
  public stack: ActivationRecord[];

  constructor() {
    this.stack = [];
  }
}

export function isCont(e: any): e is ContinuationExn {
  return e instanceof ContinuationExn;
}

export function makeCont(): ContinuationExn {
  return new ContinuationExn();
}

export class ActivationRecord {
  public ans: any;

  constructor(public fun: Function,
    public step: number,
    public args: any[],
    public vars: any[]) {
  }
}

export function isActivationRecord(f: any): f is ActivationRecord {
  return f instanceof ActivationRecord;
}

export function makeActivationRecord(fun: Function,
  step: number,
  args: any[],
  vars: any[]): ActivationRecord {
  return new ActivationRecord(fun, step, args, vars);
}

export function run(toRun: ActivationRecord): any {
  var pyretStack = [toRun];
  var $val;
  while (true) {
    try {
      while (pyretStack.length > 0) {
        var next = <ActivationRecord>pyretStack.pop();
        next.ans = $val;
        $val = next.fun(next);
      }
      return $val;
    } catch (exn) {
      if (isCont(exn)) {
        GAS = initialGas;
        for(var i = exn.stack.length-1; i >= 0; i--) {
          pyretStack.push(exn.stack[i]);
        }
        continue;
      } else {
        throw exn;
      }
    }
  }
}
