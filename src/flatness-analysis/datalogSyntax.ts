import * as assert from 'assert';

export {
  fact, query, rule, lit, variable, isValidIdentifier, groundFact,
  Fact, Query, Rule, Lit, Variable, Assertion, GroundFact,
}

const illegalChars = new Set([':', '(', '`', '\'', ')', '=', ':', '.',  '~',
  '?', '\"', '%', ' '])

function isValidIdentifier(str: string): boolean {
  return str.length >= 1 &&
    str[0].toUpperCase() !== str[0] &&
    str.split("").map((s: string) => illegalChars.has(s) === false)
       .reduce((x: boolean, y: boolean) => x && y)
}

    //assert(name.length >= 1 && name(0).isUpper &&
           //name.forall(ch => ch.isLetterOrDigit || ch == '_'))
function isValidVariableName(str: string): boolean {
  return str.length >= 1 &&
    str[0].toUpperCase() === str[0] &&
    str.split("").map((s: string) => /[a-zA-Z0-9_]/.test(s))
        .reduce((x: boolean, y: boolean) => x && y);
}

type Pred = string

// Classes for datalog terms
interface Term {
  toString(): string
}

class Lit implements Term {
  name: string;
  constructor(name: string) {
    assert(isValidIdentifier(name), `${name} is not a valid literal`)
    this.name = name;
  }
  toString(): string {
    return this.name;
  }
}
function lit(name: string) {
  return new Lit(name);
}

class Variable implements Term {
  name: string;
  constructor(name: string) {
    assert(isValidVariableName(name), `${name} is not a valid variable`);
    this.name = name;
  }
  toString(): string {
    return this.name;
  }
}
function variable(name: string) {
  return new Variable(name)
}

class Fact {
  pred: Pred;
  terms: Term[];
  constructor(pred: Pred, terms: Term[]) {
    this.pred = pred;
    this.terms = terms
  }
  toString(): string {
    return `${this.pred}(${this.terms.join(',')})`
  }
}
function fact(pred: Pred, terms: Term[]) {
  return new Fact(pred, terms)
}

interface Assertion {
  toString(): string
}

class GroundFact implements Assertion {
  fact: Fact;
  constructor(fact: Fact) {
    this.fact = fact;
  }
  toString(): string {
    return this.fact.toString() + '.'
  }
}
function groundFact(fact: Fact) {
  return new GroundFact(fact)
}

class Rule implements Assertion {
  consequent: Fact;
  antecedent: Fact[];
  constructor(cons: Fact, ant: Fact[]) {
    this.consequent = cons;
    this.antecedent = ant;
  }
  toString(): string {
    return `${this.consequent.toString()} :- ${this.antecedent.join(', ')}.`
  }
}
function rule(consequent: Fact, antecedent: Fact[]) {
  return new Rule(consequent, antecedent);
}

class Query implements Assertion {
  fact: Fact;
  constructor(fact: Fact) {
    this.fact = fact;
  }
  toString(): string {
    return `${this.fact.toString()}?`
  }
}
function query(fact: Fact) {
  return new Query(fact)
}
