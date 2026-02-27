import { useState, useEffect, useCallback, useRef } from "react";

type AngleMode = "DEG" | "RAD";

function fixFloat(n: number): number {
  return parseFloat(n.toPrecision(12));
}

function factorial(n: number): number {
  if (n < 0) throw new Error("Cannot compute factorial of negative number");
  if (!Number.isInteger(n)) throw new Error("Factorial requires an integer");
  if (n > 170) return Infinity;
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function toRadians(value: number, mode: AngleMode): number {
  return mode === "DEG" ? (value * Math.PI) / 180 : value;
}

function fromRadians(value: number, mode: AngleMode): number {
  return mode === "DEG" ? (value * 180) / Math.PI : value;
}

function formatDisplay(num: number): string {
  if (isNaN(num)) return "Error";
  if (!isFinite(num)) return num > 0 ? "Infinity" : "-Infinity";
  const str = String(num);
  if (str.length <= 14) return str;
  const fixed = fixFloat(num);
  const fixedStr = String(fixed);
  if (fixedStr.length <= 14) return fixedStr;
  return num.toExponential(8);
}

export default function Calculator() {
  const [display, setDisplay] = useState("0");
  const [expression, setExpression] = useState("");
  const [currentValue, setCurrentValue] = useState<number | null>(null);
  const [pendingOp, setPendingOp] = useState<string | null>(null);
  const [resetNext, setResetNext] = useState(false);
  const [angleMode, setAngleMode] = useState<AngleMode>("DEG");
  const [memory, setMemory] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showInverse, setShowInverse] = useState(false);
  const [waitingForExponent, setWaitingForExponent] = useState(false);
  const [parenthesesDepth, setParenthesesDepth] = useState(0);
  const [lastButtonPressed, setLastButtonPressed] = useState<string | null>(null);
  const calcRef = useRef<HTMLDivElement>(null);

  const clearError = useCallback(() => setError(null), []);

  const handleClear = useCallback(() => {
    setDisplay("0");
    setExpression("");
    setCurrentValue(null);
    setPendingOp(null);
    setResetNext(false);
    setError(null);
    setWaitingForExponent(false);
    setParenthesesDepth(0);
  }, []);

  const handleClearEntry = useCallback(() => {
    setDisplay("0");
    setResetNext(false);
    setError(null);
  }, []);

  const getDisplayValue = useCallback((): number => {
    return parseFloat(display);
  }, [display]);

  const applyOp = useCallback((a: number, op: string, b: number): number => {
    switch (op) {
      case "+": return fixFloat(a + b);
      case "-": return fixFloat(a - b);
      case "×": return fixFloat(a * b);
      case "÷":
        if (b === 0) throw new Error("Cannot divide by zero");
        return fixFloat(a / b);
      case "xʸ": return fixFloat(Math.pow(a, b));
      case "ˣ√y": {
        if (a === 0) throw new Error("Cannot compute 0th root");
        return fixFloat(Math.pow(b, 1 / a));
      }
      default: return b;
    }
  }, []);

  const handleNumber = useCallback((num: string) => {
    clearError();
    if (waitingForExponent) {
      setDisplay(prev => {
        if (prev.includes("e")) {
          return prev + num;
        }
        return prev + "e" + num;
      });
      setWaitingForExponent(false);
      return;
    }
    if (resetNext) {
      setDisplay(num === "." ? "0." : num);
      setResetNext(false);
    } else {
      if (num === "." && display.includes(".")) return;
      if (display === "0" && num !== ".") {
        setDisplay(num);
      } else {
        setDisplay(prev => prev + num);
      }
    }
  }, [clearError, display, resetNext, waitingForExponent]);

  const handleOperator = useCallback((op: string) => {
    clearError();
    const val = getDisplayValue();
    if (currentValue !== null && pendingOp && !resetNext) {
      try {
        const result = applyOp(currentValue, pendingOp, val);
        setCurrentValue(result);
        setDisplay(formatDisplay(result));
        setExpression(`${formatDisplay(result)} ${op}`);
      } catch (e: any) {
        setError(e.message);
        return;
      }
    } else {
      setCurrentValue(val);
      setExpression(`${display} ${op}`);
    }
    setPendingOp(op);
    setResetNext(true);
  }, [applyOp, clearError, currentValue, display, getDisplayValue, pendingOp, resetNext]);

  const handleEquals = useCallback(() => {
    clearError();
    if (currentValue === null || !pendingOp) return;
    const val = getDisplayValue();
    try {
      const result = applyOp(currentValue, pendingOp, val);
      setExpression(`${expression} ${display} =`);
      setDisplay(formatDisplay(result));
      setCurrentValue(null);
      setPendingOp(null);
      setResetNext(true);
    } catch (e: any) {
      setError(e.message);
    }
  }, [applyOp, clearError, currentValue, display, expression, getDisplayValue, pendingOp]);

  const handleUnaryOp = useCallback((op: string) => {
    clearError();
    const val = getDisplayValue();
    let result: number;
    try {
      switch (op) {
        case "sin":
          result = fixFloat(Math.sin(toRadians(val, angleMode)));
          setExpression(`sin(${display})`);
          break;
        case "cos":
          result = fixFloat(Math.cos(toRadians(val, angleMode)));
          setExpression(`cos(${display})`);
          break;
        case "tan": {
          const rad = toRadians(val, angleMode);
          const cosVal = Math.cos(rad);
          if (Math.abs(cosVal) < 1e-10) throw new Error("Undefined: tan at 90/270 degrees");
          result = fixFloat(Math.tan(rad));
          setExpression(`tan(${display})`);
          break;
        }
        case "sin⁻¹":
          if (val < -1 || val > 1) throw new Error("Domain error: arcsin requires -1 to 1");
          result = fixFloat(fromRadians(Math.asin(val), angleMode));
          setExpression(`sin⁻¹(${display})`);
          break;
        case "cos⁻¹":
          if (val < -1 || val > 1) throw new Error("Domain error: arccos requires -1 to 1");
          result = fixFloat(fromRadians(Math.acos(val), angleMode));
          setExpression(`cos⁻¹(${display})`);
          break;
        case "tan⁻¹":
          result = fixFloat(fromRadians(Math.atan(val), angleMode));
          setExpression(`tan⁻¹(${display})`);
          break;
        case "log":
          if (val <= 0) throw new Error("Cannot compute log of non-positive number");
          result = fixFloat(Math.log10(val));
          setExpression(`log(${display})`);
          break;
        case "ln":
          if (val <= 0) throw new Error("Cannot compute ln of non-positive number");
          result = fixFloat(Math.log(val));
          setExpression(`ln(${display})`);
          break;
        case "x²":
          result = fixFloat(val * val);
          setExpression(`(${display})²`);
          break;
        case "x³":
          result = fixFloat(val * val * val);
          setExpression(`(${display})³`);
          break;
        case "√x":
          if (val < 0) throw new Error("Cannot compute square root of negative number");
          result = fixFloat(Math.sqrt(val));
          setExpression(`√(${display})`);
          break;
        case "∛x":
          result = fixFloat(Math.cbrt(val));
          setExpression(`∛(${display})`);
          break;
        case "n!":
          result = factorial(val);
          setExpression(`(${display})!`);
          break;
        case "1/x":
          if (val === 0) throw new Error("Cannot divide by zero");
          result = fixFloat(1 / val);
          setExpression(`1/(${display})`);
          break;
        case "|x|":
          result = Math.abs(val);
          setExpression(`|${display}|`);
          break;
        case "%":
          if (currentValue !== null) {
            result = fixFloat(currentValue * val / 100);
          } else {
            result = fixFloat(val / 100);
          }
          setExpression(`${display}%`);
          break;
        case "+/-":
          result = fixFloat(-val);
          break;
        default:
          return;
      }
      setDisplay(formatDisplay(result));
      setResetNext(true);
    } catch (e: any) {
      setError(e.message);
    }
  }, [angleMode, clearError, currentValue, display, getDisplayValue]);

  const handleConstant = useCallback((c: string) => {
    clearError();
    if (c === "π") {
      setDisplay(formatDisplay(Math.PI));
      setExpression("π");
    } else if (c === "e") {
      setDisplay(formatDisplay(Math.E));
      setExpression("e");
    }
    setResetNext(true);
  }, [clearError]);

  const handleMemory = useCallback((op: string) => {
    clearError();
    const val = getDisplayValue();
    switch (op) {
      case "MC": setMemory(0); break;
      case "MR": setDisplay(formatDisplay(memory)); setResetNext(true); break;
      case "M+": setMemory(fixFloat(memory + val)); break;
      case "M-": setMemory(fixFloat(memory - val)); break;
      case "MS": setMemory(val); break;
    }
  }, [clearError, getDisplayValue, memory]);

  const handleEXP = useCallback(() => {
    clearError();
    setWaitingForExponent(true);
    setDisplay(prev => prev + "e");
  }, [clearError]);

  const handleBackspace = useCallback(() => {
    clearError();
    if (resetNext) return;
    if (display.length <= 1 || (display.length === 2 && display.startsWith("-"))) {
      setDisplay("0");
    } else {
      setDisplay(display.slice(0, -1));
    }
  }, [clearError, display, resetNext]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const key = e.key;
    if (key >= "0" && key <= "9") { handleNumber(key); return; }
    if (key === ".") { handleNumber("."); return; }
    if (key === "+") { handleOperator("+"); return; }
    if (key === "-") { handleOperator("-"); return; }
    if (key === "*") { handleOperator("×"); return; }
    if (key === "/") { e.preventDefault(); handleOperator("÷"); return; }
    if (key === "Enter" || key === "=") { handleEquals(); return; }
    if (key === "Backspace") { handleBackspace(); return; }
    if (key === "Escape") { handleClear(); return; }
    if (key === "%") { handleUnaryOp("%"); return; }
    if (key === "!") { handleUnaryOp("n!"); return; }
    if (key === "p") { handleConstant("π"); return; }
  }, [handleNumber, handleOperator, handleEquals, handleBackspace, handleClear, handleUnaryOp, handleConstant]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const buttonClass = (type: string) => {
    const base = "relative flex items-center justify-center rounded-md font-medium transition-all duration-150 select-none active:scale-[0.96] ";
    switch (type) {
      case "number":
        return base + "bg-[#2a2d37] text-white text-lg hover:bg-[#353842]";
      case "operator":
        return base + "bg-[#4a6cf7] text-white text-lg hover:bg-[#5b7bf8]";
      case "scientific":
        return base + "bg-[#1e2028] text-[#a5b4fc] text-xs hover:bg-[#282b36]";
      case "memory":
        return base + "bg-[#1e2028] text-[#6ee7b7] text-xs hover:bg-[#282b36]";
      case "function":
        return base + "bg-[#353842] text-[#94a3b8] text-sm hover:bg-[#3f4350]";
      case "equals":
        return base + "bg-[#4a6cf7] text-white text-xl font-bold hover:bg-[#5b7bf8]";
      case "clear":
        return base + "bg-[#ef4444] text-white text-sm font-bold hover:bg-[#f87171]";
      case "toggle":
        return base + "text-xs font-bold";
      default:
        return base + "bg-[#2a2d37] text-white";
    }
  };

  const handleButtonClick = (label: string, action: () => void) => {
    setLastButtonPressed(label);
    setTimeout(() => setLastButtonPressed(null), 150);
    action();
  };

  type ButtonDef = {
    label: string;
    type: string;
    action: () => void;
    span?: number;
    testId: string;
  };

  const memoryRow: ButtonDef[] = [
    { label: "MC", type: "memory", action: () => handleMemory("MC"), testId: "button-mc" },
    { label: "MR", type: "memory", action: () => handleMemory("MR"), testId: "button-mr" },
    { label: "M+", type: "memory", action: () => handleMemory("M+"), testId: "button-mplus" },
    { label: "M−", type: "memory", action: () => handleMemory("M-"), testId: "button-mminus" },
    { label: "MS", type: "memory", action: () => handleMemory("MS"), testId: "button-ms" },
  ];

  const scientificRows: ButtonDef[][] = [
    [
      { label: showInverse ? "sin⁻¹" : "sin", type: "scientific", action: () => handleUnaryOp(showInverse ? "sin⁻¹" : "sin"), testId: "button-sin" },
      { label: showInverse ? "cos⁻¹" : "cos", type: "scientific", action: () => handleUnaryOp(showInverse ? "cos⁻¹" : "cos"), testId: "button-cos" },
      { label: showInverse ? "tan⁻¹" : "tan", type: "scientific", action: () => handleUnaryOp(showInverse ? "tan⁻¹" : "tan"), testId: "button-tan" },
      { label: "x²", type: "scientific", action: () => handleUnaryOp("x²"), testId: "button-x2" },
      { label: "x³", type: "scientific", action: () => handleUnaryOp("x³"), testId: "button-x3" },
    ],
    [
      { label: "log", type: "scientific", action: () => handleUnaryOp("log"), testId: "button-log" },
      { label: "ln", type: "scientific", action: () => handleUnaryOp("ln"), testId: "button-ln" },
      { label: "√x", type: "scientific", action: () => handleUnaryOp("√x"), testId: "button-sqrt" },
      { label: "∛x", type: "scientific", action: () => handleUnaryOp("∛x"), testId: "button-cbrt" },
      { label: "xʸ", type: "scientific", action: () => handleOperator("xʸ"), testId: "button-xy" },
    ],
    [
      { label: "π", type: "scientific", action: () => handleConstant("π"), testId: "button-pi" },
      { label: "e", type: "scientific", action: () => handleConstant("e"), testId: "button-e" },
      { label: "n!", type: "scientific", action: () => handleUnaryOp("n!"), testId: "button-factorial" },
      { label: "1/x", type: "scientific", action: () => handleUnaryOp("1/x"), testId: "button-reciprocal" },
      { label: "|x|", type: "scientific", action: () => handleUnaryOp("|x|"), testId: "button-abs" },
    ],
  ];

  const mainRows: ButtonDef[][] = [
    [
      { label: "C", type: "clear", action: handleClear, testId: "button-clear" },
      { label: "CE", type: "function", action: handleClearEntry, testId: "button-ce" },
      { label: "⌫", type: "function", action: handleBackspace, testId: "button-backspace" },
      { label: "÷", type: "operator", action: () => handleOperator("÷"), testId: "button-divide" },
    ],
    [
      { label: "7", type: "number", action: () => handleNumber("7"), testId: "button-7" },
      { label: "8", type: "number", action: () => handleNumber("8"), testId: "button-8" },
      { label: "9", type: "number", action: () => handleNumber("9"), testId: "button-9" },
      { label: "×", type: "operator", action: () => handleOperator("×"), testId: "button-multiply" },
    ],
    [
      { label: "4", type: "number", action: () => handleNumber("4"), testId: "button-4" },
      { label: "5", type: "number", action: () => handleNumber("5"), testId: "button-5" },
      { label: "6", type: "number", action: () => handleNumber("6"), testId: "button-6" },
      { label: "−", type: "operator", action: () => handleOperator("-"), testId: "button-subtract" },
    ],
    [
      { label: "1", type: "number", action: () => handleNumber("1"), testId: "button-1" },
      { label: "2", type: "number", action: () => handleNumber("2"), testId: "button-2" },
      { label: "3", type: "number", action: () => handleNumber("3"), testId: "button-3" },
      { label: "+", type: "operator", action: () => handleOperator("+"), testId: "button-add" },
    ],
    [
      { label: "+/−", type: "function", action: () => handleUnaryOp("+/-"), testId: "button-negate" },
      { label: "0", type: "number", action: () => handleNumber("0"), testId: "button-0" },
      { label: ".", type: "number", action: () => handleNumber("."), testId: "button-decimal" },
      { label: "=", type: "equals", action: handleEquals, testId: "button-equals" },
    ],
  ];

  const utilRow: ButtonDef[] = [
    { label: "EXP", type: "scientific", action: handleEXP, testId: "button-exp" },
    { label: "ˣ√y", type: "scientific", action: () => handleOperator("ˣ√y"), testId: "button-nthroot" },
    { label: "%", type: "scientific", action: () => handleUnaryOp("%"), testId: "button-percent" },
    { label: "INV", type: showInverse ? "toggle" : "scientific", action: () => setShowInverse(!showInverse), testId: "button-inv" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)" }}>
      <div
        ref={calcRef}
        className="w-full max-w-[420px] rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #16171f 0%, #1a1b25 100%)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 120px rgba(74,108,247,0.08), inset 0 1px 0 rgba(255,255,255,0.05)"
        }}
        data-testid="calculator-container"
      >
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h1 className="text-[#64748b] text-xs font-semibold tracking-widest uppercase" data-testid="text-title">Scientific Calculator</h1>
            <div className="flex items-center gap-1">
              <button
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider transition-all duration-200 ${angleMode === "DEG" ? "bg-[#4a6cf7] text-white" : "bg-[#1e2028] text-[#64748b]"}`}
                onClick={() => setAngleMode("DEG")}
                data-testid="button-deg"
              >
                DEG
              </button>
              <button
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider transition-all duration-200 ${angleMode === "RAD" ? "bg-[#4a6cf7] text-white" : "bg-[#1e2028] text-[#64748b]"}`}
                onClick={() => setAngleMode("RAD")}
                data-testid="button-rad"
              >
                RAD
              </button>
              {memory !== 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#065f46] text-[#6ee7b7]" data-testid="text-memory-indicator">M</span>
              )}
            </div>
          </div>

          <div
            className="rounded-xl p-4 mb-4"
            style={{
              background: "linear-gradient(135deg, #0d0e14 0%, #12131b 100%)",
              boxShadow: "inset 0 2px 8px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.03)"
            }}
            data-testid="display-container"
          >
            <div className="text-right text-[#64748b] text-xs min-h-[18px] mb-1 truncate font-mono" data-testid="text-expression">
              {expression || "\u00A0"}
            </div>
            {error ? (
              <div className="text-right text-[#f87171] text-sm font-medium break-words" data-testid="text-error">{error}</div>
            ) : (
              <div
                className="text-right text-white font-mono tracking-wide break-all"
                style={{ fontSize: display.length > 12 ? "1.5rem" : display.length > 8 ? "2rem" : "2.5rem", lineHeight: "1.2" }}
                data-testid="text-display"
              >
                {display}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-2">
          <div className="grid grid-cols-5 gap-1.5 mb-1.5">
            {memoryRow.map((btn) => (
              <button
                key={btn.label}
                className={buttonClass(btn.type) + " h-9"}
                onClick={() => handleButtonClick(btn.label, btn.action)}
                data-testid={btn.testId}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {scientificRows.map((row, ri) => (
            <div key={ri} className="grid grid-cols-5 gap-1.5 mb-1.5">
              {row.map((btn) => (
                <button
                  key={btn.label}
                  className={buttonClass(btn.type) + " h-9"}
                  onClick={() => handleButtonClick(btn.label, btn.action)}
                  data-testid={btn.testId}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          ))}

          <div className="grid grid-cols-5 gap-1.5 mb-2">
            {utilRow.map((btn) => (
              <button
                key={btn.label}
                className={
                  (btn.label === "INV" && showInverse
                    ? buttonClass("scientific") + " ring-1 ring-[#4a6cf7] bg-[#4a6cf7]/20"
                    : buttonClass(btn.type))
                  + " h-9"
                }
                onClick={() => handleButtonClick(btn.label, btn.action)}
                data-testid={btn.testId}
              >
                {btn.label}
              </button>
            ))}
            <div></div>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-[#2a2d37] to-transparent mx-4" />

        <div className="px-4 pt-2 pb-5">
          {mainRows.map((row, ri) => (
            <div key={ri} className="grid grid-cols-4 gap-2 mb-2">
              {row.map((btn) => (
                <button
                  key={btn.label}
                  className={buttonClass(btn.type) + " h-14"}
                  style={btn.span ? { gridColumn: `span ${btn.span}` } : undefined}
                  onClick={() => handleButtonClick(btn.label, btn.action)}
                  data-testid={btn.testId}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
