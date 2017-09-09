import {NodePath, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import { cannotCapture } from '../common/cannotCapture';

export enum AppType {
  None = 0,
  Tail = 1,
  Mixed = 2
}

export type Labeled<T> = T & {
  labels?: number[],
  appType?: AppType
}

type VisitorState = {
  inTryBlock: boolean,
  inTryBlockStack: boolean[]
}

function joinAppType(x: AppType, y: AppType): AppType {
  return Math.max(x, y);
}

function meetAppType(x: AppType, y: AppType): AppType {
  return Math.min(x, y);
}

function joinAppTypes(...args: AppType[]): AppType {
  return args.reduce(joinAppType, AppType.None);
}

function meetAppTypes(x: AppType, ...args: AppType[]): AppType {
  return args.reduce(meetAppType, x);
}

function getLabels0(node: Labeled<t.Node>): number[] {
  if (node === null) {
    return [];
  }
  return node.labels === undefined ?  [] : [...node.labels];
}

export function getLabels(...nodes: Labeled<t.Node>[]): number[] {
  const r: number[] = [];
  for (const node of nodes) {
    r.push(...getLabels0(node));
  }
  return [...(new Set(r)).values()];
}

function unionLabels(labelsResult: number[], node: Labeled<t.Node>): void {
  getLabels(node).filter(x => !labelsResult.includes(x)).forEach(x =>
    labelsResult.push(x));
}

let counter: number = 0;

function getAppType(node: t.Statement | null): AppType {
  if (node === null) {
    return AppType.None;
  }
  return (<Labeled<t.Statement>>(<any>node)).appType!;
}

// true if the expression is a function call that may capture a continuation
function isUnsafeCall(e: t.Expression): boolean {
  return ((t.isCallExpression(e) || t.isNewExpression(e)) && !cannotCapture(e));
}

const visitor: Visitor = {
  TryStatement: {
    enter(this: VisitorState, path: NodePath<Labeled<t.TryStatement>>) {
      this.inTryBlockStack.push(this.inTryBlock);
      this.inTryBlock = true;
    },
    exit(this: VisitorState, path: NodePath<Labeled<t.TryStatement>>) {
      const { block, finalizer, handler } = path.node;
      this.inTryBlock = this.inTryBlockStack.pop()!;
      path.node.labels = getLabels(block, finalizer, handler && handler.body);
      // TODO(arjun): This is not exactly right. A try statement has tail calls
      // if and only if the try block has no function calls and all function
      // calls in the catch and finally block are tail calls.
      const t = joinAppTypes(getAppType(block), getAppType(finalizer),
        getAppType(handler && handler.body));
      path.node.appType = (t == AppType.None) ? AppType.None : AppType.Mixed;
    }
  },

  // TODO(arjun): I think an enclosing function will gather labels from
  // an enclosed function.
  Function: {
    enter(this: VisitorState, path: NodePath<Labeled<t.Function>>) {
      this.inTryBlockStack.push(this.inTryBlock);
      this.inTryBlock = false;
    },
    exit(this: VisitorState, path: NodePath<Labeled<t.Function>>) {
      this.inTryBlock = this.inTryBlockStack.pop()!;
    }
  },

  Program: {
    enter(this: VisitorState, path: NodePath<Labeled<t.Program>>) {
      this.inTryBlock = false;
      this.inTryBlockStack = [];
    }
  },

  ReturnStatement: {
    exit(this: VisitorState, path: NodePath<Labeled<t.ReturnStatement>>) {
      // Assumes no nested calls.
      const isCall = isUnsafeCall(path.node.argument);
      if (!isCall) {
        path.node.appType = AppType.None;
      }
      else if (this.inTryBlock) {
        path.node.appType = AppType.Mixed;
      }
      else {
        path.node.appType = AppType.Tail;
      }
    }
  },

  CallExpression: function (path: NodePath<Labeled<t.CallExpression>>): void {
    path.node.labels = [counter++];
  },

  NewExpression: function (path: NodePath<Labeled<t.NewExpression>>): void {
    path.node.labels = [counter++];
  },

  AssignmentExpression: {
    exit(path: NodePath<Labeled<t.AssignmentExpression>>): void {
      path.node.labels = getLabels(path.node.right);
    }
  },

  FunctionDeclaration: {
    exit(path: NodePath<Labeled<t.FunctionDeclaration>>) {
      path.node.appType = AppType.None;
    }
  },

  VariableDeclaration: {
    exit(path: NodePath<Labeled<t.VariableDeclaration>>) {
      path.node.appType = AppType.None;
    }
  },

  ExpressionStatement: {
    exit(path: NodePath<Labeled<t.ExpressionStatement>>): void {
      const unsafe = t.isAssignmentExpression(path.node.expression) &&
        isUnsafeCall(path.node.expression.right);
      path.node.labels = getLabels(path.node.expression);
      path.node.appType = unsafe ? AppType.Mixed : AppType.None;
    }
  },

  IfStatement: {
    exit(path: NodePath<Labeled<t.IfStatement>>): void {
      const { test, consequent, alternate } = path.node;
      path.node.labels = getLabels(consequent, alternate);
      path.node.appType = joinAppTypes(
        getAppType(consequent), getAppType(alternate));
    }
  },

  WhileStatement: {
    exit(path: NodePath<Labeled<t.WhileStatement>>): void {
      const { body } = path.node;
      path.node.labels = getLabels(body);
      path.node.appType = getAppType(body);
    }
  },

  LabeledStatement: {
    exit(path: NodePath<Labeled<t.LabeledStatement>>): void {
      const { body } = path.node;
      path.node.labels = getLabels(body);
      path.node.appType = getAppType(body);
    }
  },

  BlockStatement: {
    exit(path: NodePath<Labeled<t.BlockStatement>>): void {
      const { body } = path.node;
      path.node.labels =  getLabels(...body);
      path.node.appType = joinAppTypes(...body.map(getAppType));
    }
  },
};

export function plugin() {
  return { visitor };
}