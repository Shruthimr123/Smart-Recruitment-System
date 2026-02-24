import { WrapOptions } from "./types";
 
export function wrapJS(opts: WrapOptions): string {
  const { userCode, functionName, signature } = opts;
 
  // --- Extract parameter names from the signature dynamically ---
  const paramNamesCode = `
const signature = \`${signature}\`;
const paramTokens = signature.slice(signature.indexOf('(') + 1, signature.indexOf(')')).split(',');
const paramNames = paramTokens.map(p => p.trim().split(' ').pop()).filter(Boolean);
`;
 
  // --- Generate dynamic parsing code for JS ---
  const parseParamsCode = `
const args = paramNames.map(name => optsInput[name]);
`;
 
  // --- Generate call string dynamically ---
  const callCode = `let result = ${functionName}(...args);`;
 
  return `
${userCode}
 
// --- Helper classes ---
class TreeNode {
    constructor(val, left = null, right = null) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}
function buildTree(arr) {
    if (!arr || arr.length === 0) return null;
    const nodes = arr.map(v => v !== null ? new TreeNode(v) : null);
    let root = nodes[0], j = 1;
    for (let i = 0; i < nodes.length && j < nodes.length; i++) {
        if (nodes[i] !== null) {
            if (j < nodes.length) nodes[i].left = nodes[j++];
            if (j < nodes.length) nodes[i].right = nodes[j++];
        }
    }
    return root;
}
function treeToArray(root) {
    if (!root) return [];
    const res = [], queue = [root];
    while (queue.length) {
        const node = queue.shift();
        if (node) {
            res.push(node.val);
            queue.push(node.left);
            queue.push(node.right);
        } else res.push(null);
    }
    while (res[res.length - 1] === null) res.pop();
    return res;
}
 
class ListNode {
    constructor(val, next = null) {
        this.val = val;
        this.next = next;
    }
}
function buildList(arr) {
    if (!arr || arr.length === 0) return null;
    let dummy = new ListNode(0), curr = dummy;
    for (let val of arr) { curr.next = new ListNode(val); curr = curr.next; }
    return dummy.next;
}
function listToArray(head) {
    const res = [];
    while (head) { res.push(head.val); head = head.next; }
    return res;
}
 
// --- Read input and run test cases ---
const readline = require("readline");
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
let input = "";
rl.on("line", line => { input += line; }).on("close", () => {
    const opts = JSON.parse(input);
    const testCases = opts.testCases;
 
    ${paramNamesCode}
 
    testCases.forEach((caseObj) => {
        const optsInput = caseObj.input;
 
        // --- Parse parameters dynamically ---
        ${parseParamsCode}
 
        // --- Call user function dynamically ---
        ${callCode}
 
        // --- Convert TreeNode/ListNode to arrays if needed ---
        if (result instanceof TreeNode) result = treeToArray(result);
        if (result instanceof ListNode) result = listToArray(result);
        if (Array.isArray(result) && result[0] instanceof TreeNode) result = result.map(treeToArray);
        if (Array.isArray(result) && result[0] instanceof ListNode) result = result.map(listToArray);
 
        console.log(JSON.stringify(result));
    });
});
`.trim();
}
 
 