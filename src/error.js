export function error(message, cursor, type) {
  var e = new Error(message + ` at ${cursor.lineNumber}:${cursor.columnNumber}`);
  e.lineNumber = cursor.lineNumber;
  e.columnNumber = cursor.columnNumber;
  e.type = type;
  throw e;
}

export const ErrorType = {
  NoClosingTag: 'NoClosingTag',
  MissingEndBracket: 'MissingEndBracket',
  UnexpectedClosingTag: 'UnexpectedClosingTag',
  BadIndentation: 'BadIndentation'
};
