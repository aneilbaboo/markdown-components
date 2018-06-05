export function error(message, cursor, type) {
  var e = new Error(message + ` at ${cursor.lineNumber}:${cursor.columnNumber}`);
  e.lineNumber = cursor.lineNumber;
  e.columnNumber = cursor.columnNumber;
  e.cursor = cursor;
  e.type = type;
  throw e;
}

export const ErrorType = {
  NoClosingTag: 'NoClosingTag',
  MissingEndBracket: 'MissingEndBracket',
  UnexpectedClosingTag: 'UnexpectedClosingTag',
  BadIndentation: 'BadIndentation',
  InvalidExpression: 'InvalidExpression',
  InvalidArgument: 'InvalidArgument',
  UnexpectedOperator: 'UnexpectedOperator',
  ValueUndefined: 'ValueUndefined'
};
