import * as t from 'babel-types';

export const knowns = ['Object',
  'Function',
  'Boolean',
  'Symbol',
  'Error',
  'EvalError',
  //'InternalError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'TypeError',
  'URIError',
  'Number',
  'Math',
  'Date',
  'String',
  'RegExp',
  'Array',
  'Int8Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Int16Array',
  'Uint16Array',
  'Int32Array',
  'Uint32Array',
  'Float32Array',
  'Float64Array',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  '$GeneratorConstructor'
  ];

  export function cannotCapture(node: t.CallExpression | t.NewExpression): boolean  {
    if (node.callee.type !== 'Identifier') {
      return false;
    }
    return knowns.includes(node.callee.name);
  }
  