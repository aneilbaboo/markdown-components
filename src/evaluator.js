
import { error, ErrorType } from './error';

export const OpType = {
  funcall: 'funcall',
  and: 'and',
  or: 'or',
  not: 'not',
  scalar: 'scalar',
  accessor: 'accessor'
};

function getValue(accessor, context) {
  if (accessor.length === 0) {
    return context;
  } else {
    const [key, ...rest] = accessor;
    return getValue(rest, context ? context[key] : undefined);
  }
}

const evaluators = {
  accessor(expression, context) {
    const accessor = expression[1].split('.');
    return getValue(accessor, context);
  },
  funcall(expression, context, functions) {
    const name = expression[1];
    const functionSymbol = name.split('.');
    const location = expression[2];
    const args = expression.slice(3);
    const func = getValue(functionSymbol, functions);
    if (!func) {
      error(`Function not defined (${name})`, location, ErrorType.ValueUndefined);
    }
    const evaluatedArgs = args.map(arg => evaluate(arg, context, functions));
    // console.log('funcall(%j, %j, %j) => %s(...%j)', expression, context, functions, name, evaluatedArgs);

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
 * @param {[key: string]: (context, ...args) => any} functions
 */
export function evaluate(expression, context, functions) {
  const op = expression[0];
  // console.log('evaluate(%j, %j, %j)', expression, context, functions);
  const evaluator = evaluators[op];
  if (evaluator) {
    return evaluator(expression, context, functions);
  } else {
    throw new Error(`Fatal: unexpected expression during evaluation: ${JSON.stringify(expression)}`);
  }
}
