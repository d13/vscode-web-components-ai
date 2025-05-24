const comma = ',';
const equals = '=';
const openBrace = '{';
const openParen = '(';
const closeParen = ')';

const fnBodyRegex = /\(([\s\S]*)\)/;
const fnBodyStripCommentsRegex = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/gm;
const fnBodyStripParamDefaultValueRegex = /\s?=.*$/;

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function getParameters(fn: Function): string[] {
  if (typeof fn !== 'function') throw new Error('Not supported');

  if (fn.length === 0) return [];

  let fnBody: string = Function.prototype.toString.call(fn);
  fnBody = fnBody.replace(fnBodyStripCommentsRegex, '') || fnBody;
  fnBody = fnBody.slice(0, fnBody.indexOf(openBrace));

  let open = fnBody.indexOf(openParen);
  let close = fnBody.indexOf(closeParen);

  open = open >= 0 ? open + 1 : 0;
  close = close > 0 ? close : fnBody.indexOf(equals);

  fnBody = fnBody.slice(open, close);
  fnBody = `(${fnBody})`;

  const match = fnBodyRegex.exec(fnBody);
  return match != null
    ? match[1].split(comma).map(param => param.trim().replace(fnBodyStripParamDefaultValueRegex, ''))
    : [];
}
