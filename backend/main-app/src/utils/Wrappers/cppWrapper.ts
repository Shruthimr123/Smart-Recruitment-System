import { WrapOptions } from './types';

/**
 * Robust C++ wrapper generator
 * Automatically handles const & / non-const & / primitives / STL types safely
 */
export function wrapCppUserCode(opts: WrapOptions): string {
  const { userCode, signature } = opts;
  if (!signature) throw new Error('Function signature is required');

  // -------------------------------
  // Parse C++ signature dynamically
  // -------------------------------
  function parseCppSignature(sig: string) {
    sig = sig.trim().replace(/\s+/g, ' ');
    const openParen = sig.indexOf('(');
    const closeParen = sig.lastIndexOf(')');
    if (openParen === -1 || closeParen === -1)
      throw new Error('Invalid signature');

    const before = sig.slice(0, openParen).trim();
    const inside = sig.slice(openParen + 1, closeParen).trim();

    const beforeTokens = before.split(' ');
    const functionName = beforeTokens.pop()!;
    const returnType = beforeTokens.join(' ');

    const params: { type: string; name: string }[] = [];
    if (inside.length > 0) {
      let depth = 0;
      let current = '';
      const parts: string[] = [];
      for (const ch of inside) {
        if (ch === '<') depth++;
        if (ch === '>') depth--;
        if (ch === ',' && depth === 0) {
          parts.push(current.trim());
          current = '';
        } else current += ch;
      }
      if (current.trim()) parts.push(current.trim());

      for (const p of parts) {
        const tokens = p.trim().split(/\s+/);
        const name = tokens.pop()!;
        const type = tokens.join(' ');
        params.push({ type, name });
      }
    }

    return { returnType, functionName, params };
  }

  const { returnType, functionName, params } = parseCppSignature(signature);

  // -------------------------------
  // Generate argument parsing
  // -------------------------------
  const argParsing: string[] = [];
  const callArgs: string[] = [];

  for (const { name, type } of params) {
    const isConst = type.includes('const');
    const isRef = type.includes('&');
    const cleanType = type.replace(/const/g, '').replace(/&/g, '').trim();

    // -------------------------------
    // Handle primitives
    // -------------------------------
    if (
      ['int', 'long', 'long long', 'float', 'double', 'bool'].includes(
        cleanType,
      )
    ) {
      argParsing.push(
        `${cleanType} ${name} = caseInput["${name}"].get<${cleanType}>();`,
      );
      callArgs.push(name);

      // -------------------------------
      // Handle strings
      // -------------------------------
    } else if (cleanType === 'string' || cleanType === 'std::string') {
      if (isRef && !isConst) {
        argParsing.push(
          `std::string ${name}_local = caseInput["${name}"].get<std::string>();`,
        );
        callArgs.push(`${name}_local`);
      } else {
        argParsing.push(
          `${isConst ? 'const ' : ''}std::string ${name} = caseInput["${name}"].get<std::string>();`,
        );
        callArgs.push(name);
      }

      // -------------------------------
      // Handle STL containers including templates
      // -------------------------------
    } else if (
      cleanType.startsWith('vector<') ||
      cleanType.startsWith('std::vector<') ||
      cleanType.startsWith('map<') ||
      cleanType.startsWith('std::map<') ||
      cleanType.startsWith('unordered_map<') ||
      cleanType.startsWith('std::unordered_map<')
    ) {
      if (isRef && !isConst) {
        argParsing.push(
          `${cleanType} ${name}_local = caseInput["${name}"].get<${cleanType}>();`,
        );
        callArgs.push(`${name}_local`);
      } else {
        argParsing.push(
          `${isConst ? 'const ' : ''}${cleanType} ${name} = caseInput["${name}"].get<${cleanType}>();`,
        );
        callArgs.push(name);
      }
    } else {
      throw new Error(`Unsupported type: ${cleanType}`);
    }
  }

  // -------------------------------
  // Generate final wrapper
  // -------------------------------
  return `
#include <iostream>
#include <vector>
#include <map>
#include <unordered_map>
#include <string>
#include "json.hpp"
using namespace std;
using json = nlohmann::json;

// ----- USER CODE START -----
${userCode}
// ----- USER CODE END -----

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    try {
        string line, inputJson;
        while (getline(cin, line)) inputJson += line;

        json input = json::parse(inputJson);
        if (!input.contains("testCases") || input["testCases"].empty()) return 1;

        json caseInput = input["testCases"][0]["input"];

        // Parse parameters
${argParsing.map((x) => '        ' + x).join('\n')}

        // Call user function
        auto result = ${functionName}(${callArgs.join(', ')});

        // Output JSON
        json output;
        output["result"] = result;
        cout << output.dump() << endl;

    } catch (const exception& e) {
        json err; err["error"] = e.what(); cout << err.dump() << endl;
        return 1;
    } catch (...) {
        json err; err["error"] = "Unknown error"; cout << err.dump() << endl;
        return 1;
    }

    return 0;
}
  `.trim();
}
