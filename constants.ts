import { Language, CodeTemplate } from './types';

export const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'cpp', label: 'C++' },
  { id: 'java', label: 'Java' },
  { id: 'go', label: 'Go' },
];

export const TEMPLATES: Record<Language, CodeTemplate> = {
  python: {
    label: 'Bubble Sort',
    code: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n-i-1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
    return arr

numbers = [64, 34, 25, 12, 22, 11, 90]
sorted_numbers = bubble_sort(numbers)
print(sorted_numbers)`
  },
  javascript: {
    label: 'Binary Search Tree',
    code: `class Node {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
  }
}

function insert(root, value) {
  if (!root) return new Node(value);
  if (value < root.value) {
    root.left = insert(root.left, value);
  } else {
    root.right = insert(root.right, value);
  }
  return root;
}

let root = null;
const values = [10, 5, 15, 3, 7, 12, 18];
for (const v of values) {
  root = insert(root, v);
}`
  },
  cpp: {
    label: 'Pointer Basics',
    code: `#include <iostream>
using namespace std;

int main() {
    int x = 10;
    int* ptr = &x;
    
    *ptr = 20;
    
    int arr[3] = {1, 2, 3};
    int* arrPtr = arr;
    
    *(arrPtr + 1) = 99;
    
    return 0;
}`
  },
  java: {
    label: 'Linked List',
    code: `class Node {
    int data;
    Node next;
    Node(int d) { data = d; next = null; }
}

public class Main {
    public static void main(String[] args) {
        Node head = new Node(1);
        head.next = new Node(2);
        head.next.next = new Node(3);
        
        // Traverse
        Node current = head;
        while (current != null) {
            System.out.println(current.data);
            current = current.next;
        }
    }
}`
  },
  go: {
    label: 'Quick Sort',
    code: `package main
import "fmt"

func partition(arr []int, low, high int) int {
    pivot := arr[high]
    i := low - 1
    for j := low; j < high; j++ {
        if arr[j] < pivot {
            i++
            arr[i], arr[j] = arr[j], arr[i]
        }
    }
    arr[i+1], arr[high] = arr[high], arr[i+1]
    return i + 1
}

func quickSort(arr []int, low, high int) {
    if low < high {
        pi := partition(arr, low, high)
        quickSort(arr, low, pi-1)
        quickSort(arr, pi+1, high)
    }
}

func main() {
    arr := []int{10, 7, 8, 9, 1, 5}
    quickSort(arr, 0, len(arr)-1)
    fmt.Println(arr)
}`
  }
};
