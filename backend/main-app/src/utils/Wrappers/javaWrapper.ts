import { WrapOptions } from "./types";
 
// Utility to parse Java function signature
function parseJavaSignature(signature: string) {
  const sig = signature.trim();
  const openParen = sig.indexOf("(");
  const closeParen = sig.lastIndexOf(")");
  if (openParen === -1 || closeParen === -1) throw new Error("Invalid signature");
 
  // Function name
  const beforeParen = sig.substring(0, openParen).trim().split(/\s+/);
  const functionName = beforeParen[beforeParen.length - 1];
  const returnType = beforeParen.slice(0, -1).join(" ");
 
  // Parameters
  const paramsStr = sig.substring(openParen + 1, closeParen).trim();
  const params = paramsStr
    ? paramsStr.split(",").map(p => {
        const parts = p.trim().split(/\s+/);
        return { type: parts.slice(0, -1).join(" "), name: parts.slice(-1)[0] };
      })
    : [];
 
  return { functionName, returnType, params };
}
 
export function wrapJava(opts: WrapOptions): string {
  const { userCode, signature } = opts;
 
  // Extract params and return type automatically
  const { functionName, params } = parseJavaSignature(signature);
 
  const parseArg = (pName: string, pType: string): string => {
    pType = pType.trim();
 
    if (["int", "long", "double", "boolean", "String", "string"].includes(pType)) {
      const javaType = pType === "string" ? "String" : pType;
      return `${javaType} ${pName} = mapper.convertValue(caseInput.get("${pName}"), ${javaType}.class);`;
    }
 
    if (pType.endsWith("[]") && !pType.endsWith("[][]")) {
      const base = pType.replace("[]", "");
      const javaBase = base === "string" ? "String" : base;
      return `${javaBase}[] ${pName} = mapper.convertValue(caseInput.get("${pName}"), ${javaBase}[].class);`;
    }
 
    if (pType.endsWith("[][]")) {
      const base = pType.replace("[][]", "");
      const javaBase = base === "string" ? "String" : base;
      return `${javaBase}[][] ${pName} = mapper.convertValue(caseInput.get("${pName}"), ${javaBase}[][].class);`;
    }
 
    if (pType.startsWith("List<List<")) {
      const inner = pType.slice(10, -2);
      return `List<List<${inner}>> ${pName} = ((List<List<Object>>) caseInput.get("${pName}"))
          .stream()
          .map(innerList -> innerList.stream()
              .map(e -> mapper.convertValue(e, ${inner}.class))
              .toList()
          ).toList();`;
    }
 
    if (pType.startsWith("List<") && pType.endsWith(">")) {
      const inner = pType.slice(5, -1);
      return `List<${inner}> ${pName} = ((List<Object>) caseInput.get("${pName}"))
          .stream()
          .map(e -> mapper.convertValue(e, ${inner}.class))
          .toList();`;
    }
 
    return `${pType} ${pName} = mapper.convertValue(caseInput.get("${pName}"), ${pType}.class);`;
  };
 
  const parseArgsCode = params.map(p => parseArg(p.name, p.type)).join("\n            ");
  const callArgs = params.map(p => p.name).join(", ");
 
  return `
import java.util.*;
import java.net.*;
import com.fasterxml.jackson.databind.ObjectMapper;
 
// ===== Built-in LeetCode Helper Classes =====
class ListNode {
    int val;
    ListNode next;
    ListNode(int x) { val = x; }
}
 
class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;
    TreeNode(int x) { val = x; }
}
// ===========================================
 
class Solution {
    // ----- USER CODE START -----
${userCode}
    // ----- USER CODE END -----
}
 
public class Main {
 
    static final ObjectMapper mapper = new ObjectMapper();
 
    public static Object normalize(Object x) {
        if (x instanceof List<?>) {
            List<Object> lst = new ArrayList<>();
            for (Object i : (List<?>) x) lst.add(normalize(i));
            return lst;
        }
        if (x instanceof Map<?, ?>) {
            Map<String,Object> map = new TreeMap<>();
            for (Map.Entry<?,?> e : ((Map<?,?>)x).entrySet()) {
                map.put(String.valueOf(e.getKey()), normalize(e.getValue()));
            }
            return map;
        }
        return x;
    }
 
    @SuppressWarnings("unchecked")
    public static void main(String[] args) throws Exception {
        Scanner sc = new Scanner(System.in);
        String inputJson = sc.nextLine();
        Map<String,Object> opts = mapper.readValue(inputJson, Map.class);
        List<Map<String,Object>> testCases = (List<Map<String,Object>>) opts.get("testCases");
 
        Solution sol = new Solution();
 
        for (Map<String,Object> caseObj : testCases) {
            Map<String,Object> caseInput = (Map<String,Object>) caseObj.get("input");
 
            // Parse parameters
            ${parseArgsCode}
 
            // Call user's function
            Object result = sol.${functionName}(${callArgs});
 
            // Normalize result
            Object normalized = normalize(result);
 
            // Output as JSON
            System.out.println(mapper.writeValueAsString(normalized));
        }
    }
}
`.trim();
}
 