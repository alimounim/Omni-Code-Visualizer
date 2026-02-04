
export type Language = 'python' | 'javascript' | 'cpp' | 'java' | 'go';

export type VariableType = 'primitive' | 'array' | 'object' | 'tree_node' | 'linked_list_node' | 'pointer' | 'map' | 'stack' | 'queue';

export interface VariableValue {
  type: VariableType;
  value: any; // The actual value or structure
  displayValue?: string; // String representation for simple display
  address?: string; // Simulated memory address (e.g., 0x4f2a)
  // For pointer/reference types
  targetAddress?: string; 
  // For collections
  children?: VariableValue[]; 
  // For objects/maps
  properties?: Record<string, VariableValue>;
}

export interface ActiveAccess {
  target: string; // The variable name of the collection being accessed
  index?: number | string; // The index value (number or key)
  indexVar?: string; // The variable name used as index (e.g. 'i')
}

export interface ControlFlow {
  type: 'decision' | 'call' | 'loop' | 'return';
  condition?: string; // e.g. "arr[j] > arr[j+1]"
  result?: string; // e.g. "True", "False"
  description?: string; // e.g. "Swapping elements"
}

export interface EventLoopState {
  callStack: { name: string; id?: string }[];
  webApis: { id: string; type: string; callback: string; duration?: number; timeLeft?: number }[];
  taskQueue: { id: string; name: string }[];
  microtaskQueue: { id: string; name: string }[];
}

export interface TraceStep {
  line: number;
  event: 'step' | 'return' | 'exception' | 'start' | 'end';
  output: string; // Accumulated stdout
  variables: Record<string, VariableValue>;
  explanation?: string; // Optional AI explanation
  
  // New Enhanced Features
  scopeName?: string; // Name of current function scope (e.g. 'main', 'bubble_sort')
  activeAccess?: ActiveAccess; // Information about collection access (arr[i])
  controlFlow?: ControlFlow; // Flowchart data
  eventLoop?: EventLoopState; // JavaScript Event Loop State
}

export interface ExecutionTrace {
  steps: TraceStep[];
  error?: string;
}

export interface CodeTemplate {
  label: string;
  code: string;
}
