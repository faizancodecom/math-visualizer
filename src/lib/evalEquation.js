/**
 * Parametric Equation Parser & Evaluator
 * Safely parses mathematical string equations (including LaTeX, copied equations,
 * implicit multiplication, and standard formulas) into 2D trajectory points.
 */

export const EQUATION_TEMPLATES = [
  {
    name: 'Lissajous 3:2 Harmonic',
    xExpr: '150 * cos(3 * t)',
    yExpr: '150 * sin(2 * t)'
  },
  {
    name: 'Astroid (4-Cusped Star)',
    xExpr: '160 * pow(cos(t), 3)',
    yExpr: '160 * pow(sin(t), 3)'
  },
  {
    name: 'Harmonic Rose (8 Petals)',
    xExpr: '160 * cos(4 * t) * cos(t)',
    yExpr: '160 * cos(4 * t) * sin(t)'
  },
  {
    name: 'Spirograph / Epitrochoid',
    xExpr: '120 * cos(t) - 50 * cos(4 * t)',
    yExpr: '120 * sin(t) - 50 * sin(4 * t)'
  },
  {
    name: 'Fourier Square Wave Superposition',
    xExpr: '130 * (cos(t) + cos(3 * t) / 3 + cos(5 * t) / 5)',
    yExpr: '130 * (sin(t) + sin(3 * t) / 3 + sin(5 * t) / 5)'
  },
  {
    name: 'Cardioid Heart',
    xExpr: '16 * pow(sin(t), 3) * 10',
    yExpr: '-(13 * cos(t) - 5 * cos(2 * t) - 2 * cos(3 * t) - cos(4 * t)) * 10'
  }
];

export function sanitizeMathExpr(expr) {
  if (!expr || typeof expr !== 'string') return '0';
  let s = expr.trim();

  // Normalize Unicode math characters
  s = s
    .replace(/[\u2212\u2013\u2014]/g, '-') // Unicode minus / dashes -> ASCII '-'
    .replace(/[×⋅·]/g, '*')                // Multiplication symbols -> '*'
    .replace(/÷/g, '/')                    // Division symbol -> '/'
    .replace(/π/g, 'pi');                  // Greek pi -> 'pi'

  // Strip leading variable assignments like 'x(t) \approx', 'y(t) =', 'x =', 'z(t) ≈', etc.
  s = s.replace(/^[xyzt]\s*(\([a-z0-9_]*\))?\s*(\\approx|\\sim|≈|=|:=)?\s*/i, '');
  s = s.replace(/^(\\approx|\\sim|≈|=|:=)\s*/i, '');

  // Strip trailing dots/ellipses like '+ \dots', '...', '+ ...'
  s = s.replace(/\s*([\+\-]\s*)?(\\dots|\\cdots|\.\.\.|…)\s*$/gi, '');
  s = s.replace(/\s*[\+\-]\s*$/g, '');

  // Strip LaTeX command backslashes and formatting
  s = s.replace(/\\(cos|sin|tan|exp|sqrt|abs|pi|pow)/gi, '$1');
  s = s.replace(/\\(approx|sim|left|right)/gi, '');
  s = s.replace(/\\(cdot|times)/gi, '*');
  s = s.replace(/\{/g, '(').replace(/\}/g, ')');
  s = s.replace(/\\/g, ''); // Remove any remaining backslashes

  // Replace ^ with **
  s = s.replace(/\^/g, '**');

  // Implicit multiplication: number before letter or '('
  // e.g., '154.8 cos' -> '154.8 * cos', '-2t' -> '-2 * t', '10(t)' -> '10 * (t)'
  s = s.replace(/(\d+(?:\.\d+)?)\s*([a-zA-Z(])/g, '$1 * $2');

  // Implicit multiplication: ')' before number, letter, or '('
  // e.g., '(t)cos' -> '(t) * cos', ')(' -> ') * ('
  s = s.replace(/\)\s*([a-zA-Z0-9(])/g, ') * $1');

  // Implicit multiplication: 't' followed by number, function or '('
  s = s.replace(/\bt\s*([a-zA-Z0-9(])/g, 't * $1');

  // Replace math function names with Math.<func>
  s = s.replace(/\bpi\b/gi, 'Math.PI');
  s = s.replace(/\bcos\b/gi, 'Math.cos');
  s = s.replace(/\bsin\b/gi, 'Math.sin');
  s = s.replace(/\btan\b/gi, 'Math.tan');
  s = s.replace(/\babs\b/gi, 'Math.abs');
  s = s.replace(/\bpow\b/gi, 'Math.pow');
  s = s.replace(/\bsqrt\b/gi, 'Math.sqrt');
  s = s.replace(/\bexp\b/gi, 'Math.exp');

  // Fix any accidental duplicate multiplication operators '* *' (except '**')
  s = s.replace(/(\*)\s*\*(?!\*)/g, '$1');

  return s.trim() || '0';
}

export function evaluateParametricEquation(xExpr, yExpr, sampleCount = 256) {
  const cleanX = sanitizeMathExpr(xExpr);
  const cleanY = sanitizeMathExpr(yExpr);

  let fnX, fnY;
  try {
    fnX = new Function('t', 'Math', `return (${cleanX});`);
  } catch (err) {
    throw new Error(`Syntax error in x(t) equation: ${err.message}`);
  }

  try {
    fnY = new Function('t', 'Math', `return (${cleanY});`);
  } catch (err) {
    throw new Error(`Syntax error in y(t) equation: ${err.message}`);
  }

  const points = [];
  for (let i = 0; i < sampleCount; i++) {
    const t = (2 * Math.PI * i) / sampleCount;
    let x, y;

    try {
      x = fnX(t, Math);
    } catch (err) {
      throw new Error(`Runtime error evaluating x(t) at t=${t.toFixed(2)}: ${err.message}`);
    }

    try {
      y = fnY(t, Math);
    } catch (err) {
      throw new Error(`Runtime error evaluating y(t) at t=${t.toFixed(2)}: ${err.message}`);
    }

    if (isNaN(x) || isNaN(y)) {
      throw new Error(`Equation returned NaN at t=${t.toFixed(2)}. Check for division by zero or invalid roots.`);
    }

    points.push({ x: Number(x), y: Number(y) });
  }

  return points;
}
