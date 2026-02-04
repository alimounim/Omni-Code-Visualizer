import { GoogleGenAI } from "@google/genai";
import { ExecutionTrace, Language } from "../types";

const SYSTEM_INSTRUCTION = `
You are the "Omni-Code Execution Engine". Your goal is to analyze code and generate a detailed, step-by-step execution trace in JSON format.
This trace will be used to visualize data structures, memory, control flow, and array indexing in a web IDE.

RULES:
1.  Analyze the provided code logically.
2.  Generate a sequence of steps representing the execution flow.
3.  For each step, provide:
    *   line: The current line number being executed (1-based).
    *   event: 'step', 'return', 'exception', 'start', 'end'.
    *   output: Any accumulated stdout/print output up to this point.
    *   variables: A dictionary of ALL variables currently in scope.
    *   scopeName: The name of the current function/scope (e.g., "global", "bubble_sort", "dfs", "Stack.push").
    *   explanation: **MANDATORY**. A brief, "Professor-style" narration of what is happening at this specific step. It should be spoken language, educational, and concise. (e.g. "We initialize the index variable i to 0.", "Now we check if the current element is greater than the pivot.").
    *   activeAccess: If a collection (Array/Map) is being accessed using a variable index (e.g., arr[i]), provide { target: "arr", index: <current_value_of_i>, indexVar: "i" }.
    *   controlFlow: If this line involves a decision (if/else, for loop check, while check), provide { type: "decision"|"loop", condition: "<condition_string>", result: "True"|"False", description: "<short_desc>" }.
    *   (JavaScript Only) eventLoop: Provide the state of the Event Loop:
        *   callStack: List of function names currently in the stack (e.g. ["main", "setTimeout"]).
        *   webApis: List of active async operations (e.g. [{id: "t1", type: "timeout", callback: "cb", duration: 1000}]).
        *   taskQueue: List of callbacks ready to run (Macrotasks).
        *   microtaskQueue: List of promises/microtasks ready to run.

VARIABLE CAPTURE RULES:
1.  **Local Variables**: Include all local variables.
2.  **Class Context**: If executing inside a class method, YOU MUST INCLUDE the instance variable ('self' in Python, 'this' in JS/Java/C++) in the variables list.
3.  **Variable Typing**:
    *   **Arrays**: value should be a simple list.
    *   **Trees/Linked Lists**: Represent as nested objects. Use 'tree_node' or 'linked_list_node'.
    *   **Stacks/Queues**: 
        *   If a variable (or 'self') is logically used as a Stack (LIFO) or Queue (FIFO)—regardless of implementation (Array, List, Class, Deque)—set "type" to "stack" or "queue".
        *   **CRITICAL**: For the "value", provided the FLATTENED list of elements currently in the stack/queue. Do not provide the internal object structure (e.g. don't return {items: [...]}, just return [...]).
    *   **Objects/Maps**: Use 'map' or 'object'.
    *   **Pointers (C++)**:
        *   Explicitly set "type": "pointer".
        *   "value": The formatted address it holds (e.g., "0x104").
        *   "targetAddress": The address of the variable it points to.
        *   If pointing to null, set "value": "nullptr" or "NULL".

VARIABLE STRUCTURE:
Each variable in the 'variables' map must follow this schema:
{
  "type": "primitive" | "array" | "object" | "tree_node" | "linked_list_node" | "pointer" | "map" | "stack" | "queue",
  "value": <the actual value>,
  "displayValue": <string representation>,
  "address": <simulated hex memory address, e.g., "0x7ff...1" or simple "0x100">,
  "targetAddress": <for pointers, the address they point to>,
  "properties": <for objects/nodes, a map of field names to their values>,
}

MEMORY SIMULATION HINTS:
*   Assign realistic, consistent hex addresses to all variables (e.g., int x at 0x100, int* p at 0x108).
*   Ensure pointer 'targetAddress' matches the 'address' of the target variable exactly.

JAVASCRIPT ASYNC SIMULATION:
*   If using setTimeout/setInterval/Promises, you MUST generate steps that simulate the Event Loop.
*   When a timer starts, add it to 'webApis'.
*   Create an explicit step where 'main' finishes (stack empty), but 'webApis' still has the timer.
*   Create a step where the timer moves from 'webApis' to 'taskQueue'.
*   Create a step where the 'taskQueue' item moves to 'callStack' and executes.
*   **Highlighting**: During the "wait" phase, keep the highlight on the last synchronous line executed, or on a special "Event Loop" line if possible.

OUTPUT FORMAT:
Return a JSON object containing a "steps" array.
`;

export const generateExecutionTrace = async (code: string, language: Language, feedback?: string): Promise<ExecutionTrace> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please select an API key.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let prompt = `
    Language: ${language}
    Code:
    ${code}
    
    Execute this code and return the JSON trace.
  `;

  if (feedback) {
    prompt += `
    
    CRITICAL CORRECTION REQUEST:
    The user reviewed a previous execution trace of this code and reported the following error/issue:
    "${feedback}"

    You MUST strictly adhere to this feedback. Re-analyze the code and generate a NEW JSON trace that fixes this specific issue.
    `;
  }

  try {
    // Switch to gemini-3-flash-preview for faster generation speed while maintaining good logic capabilities for standard algorithms.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text);
    return data as ExecutionTrace;

  } catch (error) {
    console.error("Gemini Execution Error:", error);
    return {
        steps: [],
        error: error instanceof Error ? error.message : "An unknown error occurred during execution trace generation."
    };
  }
};

/**
 * Runs the code and returns strictly the stdout output.
 * Does NOT generate visualization data.
 * Can handle simulated stdin if provided.
 */
export const executeCode = async (code: string, language: Language, stdin: string = ""): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let prompt = `
    Language: ${language}
    Code:
    ${code}
  `;

  if (stdin) {
    prompt += `\nStandard Input (stdin):\n${stdin}\n`;
  }

  prompt += `\nRun this code and provide the standard output (stdout).`;

  const systemInstruction = `
    You are a code execution engine.
    Your task is to mentally execute the provided code and return ONLY the standard output (stdout).
    
    RULES:
    1. Return ONLY the raw output string.
    2. Do NOT wrap in markdown code blocks (unless the code itself prints markdown).
    3. Do NOT provide explanations like "Here is the output".
    4. If 'Standard Input' is provided in the prompt, use it to satisfy input()/cin/etc calls.
    5. If the code expects input but none is provided, use empty defaults (e.g. empty string, 0) instead of erroring, unless it causes a crash.
    6. If there is a syntax error or runtime error, output the error message directly.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        systemInstruction,
        temperature: 0 // Deterministic output
      }
    });

    return response.text || "";
  } catch (error) {
    console.error("Gemini Run Error:", error);
    return `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
};

export const askGemini = async (message: string, codeContext: string, language: string): Promise<string> => {
    if (!process.env.API_KEY) throw new Error("API Key is missing.");

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // We use Flash for the assistant for speed and responsiveness.
    const model = 'gemini-3-flash-preview'; 

    const systemInstruction = `You are an intelligent coding assistant embedded in the Omni-Code-Visualizer. 
    The user is currently writing ${language} code.
    
    Capabilities:
    1. Explain the provided code clearly.
    2. Fix bugs or syntax errors.
    3. Optimize or refactor code.
    4. Answer general programming questions.
    
    Formatting:
    - If you provide code, you MUST wrap it in markdown code blocks, e.g., \`\`\`${language}\n...code...\n\`\`\`.
    - Be concise and helpful.`;

    const prompt = `
    CURRENT CODE CONTEXT:
    \`\`\`${language}
    ${codeContext}
    \`\`\`

    USER QUESTION:
    ${message}
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { systemInstruction }
        });
        return response.text || "I couldn't generate a response.";
    } catch (e) {
        console.error("Gemini Chat Error:", e);
        return "Error connecting to Gemini. Please check your API key.";
    }
};
