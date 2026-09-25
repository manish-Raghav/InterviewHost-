export const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', judged: true },
  { id: 'python', label: 'Python', judged: false },
  { id: 'java', label: 'Java', judged: false },
  { id: 'cpp', label: 'C++', judged: false },
];

// Both participants derive the same starter text, so nothing needs to be synced until someone types.
export const STARTERS = {
  javascript: `// The test input is available as the global string \`input\`.
// Print your answer with console.log.

const numbers = input.trim().split(/\\s+/).map(Number);
console.log(numbers.reduce((a, b) => a + b, 0));
`,
  python: `# Write your solution here.
import sys

data = sys.stdin.read()
print(data)
`,
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Write your solution here.
    }
}
`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    // Write your solution here.
    return 0;
}
`,
};

export const isStarterCode = (code) => !code.trim() || Object.values(STARTERS).includes(code);
