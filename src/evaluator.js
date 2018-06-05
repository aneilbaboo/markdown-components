const evaluators = {
  accessor(expression, context) {
    function getValue(accessor, value) {
      if (accessor.length === 0) {
        return value;
      } else {
        const [key, ...rest] = accessor;
        return getValue(rest, value ? value[key] : undefined);
      }
    }
    const accessor = expression[1].split('.');
    return getValue(accessor, context);
  },
  funcall(expression, context, functions) {
    const name = expression[1];
    const func = functions[name];
    const args = expression.slice(2);
    const evaluatedArgs = args.map(arg => evaluate(arg, context, functions));
    return func(context, ...evaluatedArgs);
  },
  and(expression, context, functions) {
    const lhs = expression[1];
    const rhs = expression[2];
    return (
      evaluate(lhs, context, functions) &&
      evaluate(rhs, context, functions)
    );
  },
  or(expression, context, functions) {
    const lhs = expression[1];
    const rhs = expression[2];
    return (
      evaluate(lhs, context, functions) ||
      evaluate(rhs, context, functions)
    );
  },
  not(expression, context, functions) {
    return !evaluate(expression[1], context, functions);
  },
  scalar(expression) {
    return expression[1];
  }
};

/**
 * Evaluates an interpolation expression
 *
 * @param {[string, ...any[]]} expression - [op, ...args]
 * @param {[key: string]: any} context
 * @param {[key: string]: (context, ...args)} functions
 */
export function evaluate(expression, context, functions) {
  const op = expression[0];
  console.log('evaluate(%j, %j, %j)', expression, context, functions);
  const evaluator = evaluators[op];
  if (evaluator) {
    return evaluator(expression, context, functions);
  } else {
    throw new Error(`Fatal: unexpected expression during evaluation: ${JSON.stringify(expression)}`);
  }
}
