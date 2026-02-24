import { WrapOptions } from "./types";
 
export function wrapPython(opts: WrapOptions): string {
  const { userCode, functionName } = opts;
 
  return `
import json, sys, inspect
from typing import Any, List, Dict, get_type_hints
 
def parse_input(value: Any, type_str: str):
    if value is None: return None
    if type_str == "int": return int(value)
    if type_str == "float": return float(value)
    if type_str == "bool": return value if isinstance(value,bool) else str(value).lower() in ("true","1","yes")
    if type_str == "string" or type_str == "str": return str(value)
    if type_str.endswith("[]") and not type_str.endswith("[][]"):
        base = type_str[:-2]
        return [parse_input(v, base) for v in value]
    if type_str.endswith("[][]"):
        base = type_str[:-4]
        return [[parse_input(v, base) for v in row] for row in value]
    if type_str.startswith("tuple["):
        inner = type_str[6:-1].split(",")
        return tuple(parse_input(v, t.strip()) for v, t in zip(value, inner))
    if type_str.startswith("list["):
        inner = type_str[5:-1]
        return [parse_input(v, inner) for v in value]
    if type_str.startswith("dict["):
        key_t,val_t = type_str[5:-1].split(",")
        return {parse_input(k,key_t.strip()): parse_input(v,val_t.strip()) for k,v in value.items()}
    return value
 
def normalize(x):
    if isinstance(x, list):
        return sorted([normalize(i) for i in x], key=lambda v: json.dumps(v, sort_keys=True))
    if isinstance(x, dict):
        return {k: normalize(x[k]) for k in sorted(x)}
    return x
 
# ----- USER CODE START -----
_user_code = "from typing import Any, List, Dict\\n" + ${JSON.stringify(userCode)}
exec(_user_code, globals())
# ----- USER CODE END -----
 
if __name__ == "__main__":
    opts = json.loads(sys.stdin.read())
    func_name = opts.get("functionName")
    test_cases = opts.get("testCases", [])
 
    if func_name not in globals():
        raise NameError(f"Function '{func_name}' not defined")
 
    func = globals()[func_name]
    sig = inspect.signature(func)
    hints = get_type_hints(func)
 
    for case in test_cases:
        args = []
        for param_name, param in sig.parameters.items():
            param_type = hints.get(param_name, param.annotation)
            type_str = str(param_type)
            # simplify type names
            type_str = (
                type_str.replace("<class 'int'>", "int")
                        .replace("<class 'float'>", "float")
                        .replace("<class 'str'>", "string")
                        .replace("<class 'bool'>", "bool")
                        .replace("typing.List", "list")
                        .replace("typing.Dict", "dict")
                        .replace("typing.Tuple", "tuple")
            )
            args.append(parse_input(case["input"].get(param_name), type_str))
 
        result = func(*args)
        print(json.dumps(normalize(result)))
        sys.stdout.flush()
  `.trim();
}