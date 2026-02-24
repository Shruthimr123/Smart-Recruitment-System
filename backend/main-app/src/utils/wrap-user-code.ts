
import { WrapOptions } from "./Wrappers/types";
import { wrapPython } from "./Wrappers/pythonWrapper";
import { wrapJava } from "./Wrappers/javaWrapper";
import { wrapJS } from "./Wrappers/jsWrapper";
import { wrapCppUserCode } from "./Wrappers/cppWrapper";
import { wrapCSharp } from "./Wrappers/csharpWrapper";

 
export function wrapUserCode(opts: WrapOptions): string {
  switch (opts.language.toLowerCase()) {
    case "python":
      return wrapPython(opts);
    case "java":
      return wrapJava(opts);
    case "javascript":
      return wrapJS(opts);
    case "cpp":
       return wrapCppUserCode(opts);
     
    case "csharp":
       return wrapCSharp(opts);
   
    default:
      return opts.userCode;
  }
}