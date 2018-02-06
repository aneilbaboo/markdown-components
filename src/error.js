export default function error(message, cursor, type) {
  var e = new Error(message + ` at ${cursor.lineNumber}:${cursor.columnNumber}`);
  e.lineNumber = cursor.lineNumber;
  e.columnNumber = cursor.columnNumber;
  e.type = type;
  throw e;
}
