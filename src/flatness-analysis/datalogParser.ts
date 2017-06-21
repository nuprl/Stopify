import * as d from './datalogSyntax'
export { parse }

function parseId(str: string): d.Lit {
  if(d.isValidIdentifier(str)) {
    return d.lit(str)
  } else {
    throw new Error(`Parsing Error: ${str} is not a valid datalog identifier`)
  }
}

// NOTE(rachit): the fact parser does not expect a '.' at the end of a fact.o
// Also note that the parser doesn't expect any spaces in the input.
function parseFact(str: string): d.Fact {
  const factRegex = /([a-zA-Z0-9_]+)\((([a-zA-Z0-9_]+,)*[a-zA-Z0-9_]+)\)/
  const res = factRegex.exec(str);
  if (res !== null) {
    const terms = res[2].split(',').map((r: string) => d.lit(r))
    const pred = res[1]
    return d.fact(pred, terms)
  } else {
    throw new Error(`Parsing Error: ${str} is not a valid fact`)
  }
}

function parse(data: string): d.Fact[] {
  // Remove spaces and line breaks.
  const stripped = data.split('.').map((s: string) => s.replace(/[ \n]/g, ''))
                                  .filter((s: string) => s.length > 0)
  return stripped.map((d: string) => parseFact(d))
}
