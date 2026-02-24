import { WrapOptions } from "./types";
 
export function wrapCSharp(opts: WrapOptions): string {
  const { userCode, signature } = opts;
  if (!signature) throw new Error("Function signature is required");
 
  // Extract function info
  const funcMatch = signature.match(/(public|private|protected)?\s*(static)?\s*(\S+)\s+(\w+)\s*\(([^)]*)\)/);
  if (!funcMatch) throw new Error("Cannot parse function signature");
 
  const isStatic = !!funcMatch[2];
  const returnType = funcMatch[3];
  const functionName = funcMatch[4];
  const paramsRaw = funcMatch[5];
 
  // Extract parameter list with types
  const paramsList: { name: string; type: string }[] = paramsRaw
    ? paramsRaw.split(",").map(p => {
        const tokens = p.trim().split(/\s+/);
        const name = tokens.pop()!;
        const type = tokens.join(" ");
        return { name, type };
      })
    : [];
 
  // Detect if user code already contains a class
  const hasClass = /class\s+\w+/.test(userCode);
 
  // Build InputModel with proper types
  const inputProps = paramsList
    .map(p => {
      let typeStr = "dynamic";
 
      // Map common types
      if (p.type === "int") typeStr = "int";
      else if (p.type === "int[]") typeStr = "int[]";
      else if (p.type === "int[][]") typeStr = "int[][]";
      else if (p.type === "string") typeStr = "string";
      else if (p.type === "string[]") typeStr = "string[]";
      else if (p.type === "bool") typeStr = "bool";
      else if (p.type === "double") typeStr = "double";
      // Add more types here if needed
 
      return `[JsonProperty("${p.name}")] public ${typeStr} ${p.name} { get; set; }`;
    })
    .join("\n    ");
 
  // Build method call
  const callCode = isStatic
    ? `${functionName}(${paramsList.map(p => `input.${p.name}`).join(", ")})`
    : `(new Solution()).${functionName}(${paramsList.map(p => `input.${p.name}`).join(", ")})`;
 
  // Debug lines for each parameter
  const debugParams = paramsList
    .map(p => `Console.WriteLine("DEBUG: ${p.name} = " + JsonConvert.SerializeObject(input.${p.name})); Console.Out.Flush();`)
    .join("\n                ");
 
  return `
using System;
using System.Linq;
using System.Collections.Generic;
using Newtonsoft.Json;
 
${hasClass ? userCode : `public class Solution { ${userCode} }`}
 
public class InputModel {
    ${inputProps}
}
 
public class TestCase {
    public InputModel input { get; set; }
}
 
public class Root {
    public TestCase[] testCases { get; set; }
}
 
public class Program {
    public static void Main(string[] args) {
        try {
            Console.WriteLine("DEBUG: Program started");
            Console.Out.Flush();
 
            string json = args.Length > 0 ? args[0] : Console.ReadLine();
            Console.WriteLine("DEBUG: Input JSON = " + json);
            Console.Out.Flush();
 
            var root = JsonConvert.DeserializeObject<Root>(json);
            if (root?.testCases == null) {
                Console.WriteLine("DEBUG: No test cases found.");
                Console.Out.Flush();
                return;
            }
 
            foreach (var testCase in root.testCases) {
                var input = testCase.input;
                if (input == null) {
                    Console.WriteLine("DEBUG: Test case input is null.");
                    Console.Out.Flush();
                    continue;
                }
 
                // Debug each parameter
                ${debugParams}
 
                object result = null;
                try {
                    Console.WriteLine("DEBUG: Calling method ${functionName}...");
                    Console.Out.Flush();
 
                    result = ${callCode};
 
                    Console.WriteLine("DEBUG: Method returned: " + JsonConvert.SerializeObject(result));
                    Console.Out.Flush();
                } catch (Exception ex) {
                    Console.WriteLine("DEBUG: Error calling method: " + ex);
                    Console.Out.Flush();
                }
 
                
                Console.WriteLine(JsonConvert.SerializeObject(result));
                Console.Out.Flush();
            }
        } catch (Exception ex) {
            Console.WriteLine("DEBUG: Exception in Main: " + ex);
            Console.Out.Flush();
        }
    }
}
`.trim();
}