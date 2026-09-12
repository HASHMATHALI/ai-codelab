import { BugExample } from '@/types';

export const BUG_EXAMPLES: BugExample[] = [
  {
    id: 'python-index-error',
    title: 'Python — IndexError',
    category: 'Runtime Error',
    language: 'python',
    tagline: 'Program crashes with IndexError when input list is empty or smaller than expected',
    code: `def get_first_and_last(items):
    """
    Returns a tuple with the first and last elements of the list.
    """
    first_item = items[0]
    last_item = items[-1]
    return (first_item, last_item)

# Test with empty input:
test_data = []
result = get_first_and_last(test_data)
print("Result:", result)
`,
    error: 'IndexError: list index out of range\n  File "main.py", line 5, in get_first_and_last\n    first_item = items[0]',
    expectedOutput: '(None, None) or graceful error handling',
    actualOutput: 'IndexError: list index out of range',
    userDescription: 'This works fine for lists with elements, but crashes immediately with an IndexError whenever the input list is empty.',
  },
  {
    id: 'javascript-undefined-property',
    title: 'JavaScript — Undefined Property',
    category: 'Type Error',
    language: 'javascript',
    tagline: 'Cannot read properties of undefined (reading "name") when user object is incomplete',
    code: `function formatUserProfile(response) {
  // Extract user profile and display details
  const user = response.data.user;
  const displayName = user.profile.name;
  const avatarUrl = user.profile.avatar || "/default.png";

  return {
    name: displayName.toUpperCase(),
    avatar: avatarUrl,
    memberSince: user.createdAt
  };
}

// Simulated API response where profile hasn't been set yet:
const apiPayload = {
  data: {
    user: {
      id: "u_1092",
      createdAt: "2026-01-15"
      // Note: profile object is missing!
    }
  }
};

console.log(formatUserProfile(apiPayload));
`,
    error: 'TypeError: Cannot read properties of undefined (reading "name")\n    at formatUserProfile (main.js:4:28)',
    expectedOutput: '{ name: "ANONYMOUS", avatar: "/default.png", memberSince: "2026-01-15" }',
    actualOutput: 'TypeError: Cannot read properties of undefined (reading "name")',
    userDescription: 'Why am I getting "Cannot read properties of undefined"? It crashes in production whenever new users sign up without filling out their profile.',
  },
  {
    id: 'cpp-segfault',
    title: 'C++ — Segmentation Fault',
    category: 'Runtime Error',
    language: 'cpp',
    tagline: 'Program crashes with Segfault due to off-by-one boundary traversal in vector',
    code: `#include <iostream>
#include <vector>

int computeRunningSum(const std::vector<int>& numbers) {
    int total = 0;
    // Bug: loop condition uses <= instead of <, exceeding vector bounds
    for (size_t i = 0; i <= numbers.size(); ++i) {
        total += numbers[i];
    }
    return total;
}

int main() {
    std::vector<int> data = {10, 20, 30, 40};
    int sum = computeRunningSum(data);
    std::cout << "Sum: " << sum << std::endl;
    return 0;
}
`,
    error: 'Segmentation fault (core dumped) / undefined memory access at numbers[4]',
    expectedOutput: 'Sum: 100',
    actualOutput: 'Segmentation fault (core dumped)',
    userDescription: 'My C++ program crashes with a segmentation fault on larger inputs or produces garbage numbers randomly.',
  },
  {
    id: 'python-wrong-output',
    title: 'Python — Wrong Output (Logic Bug)',
    category: 'Logic Bug',
    language: 'python',
    tagline: 'Expected 15 but getting 10 due to flawed range boundary and accumulator reset',
    code: `def calculate_sum_up_to(n):
    """
    Computes the sum of all integers from 1 up to and including n.
    E.g. for n = 5: 1 + 2 + 3 + 4 + 5 = 15
    """
    total = 0
    # Bug: range(1, n) stops at n - 1 instead of n!
    for i in range(1, n):
        total += i
    return total

result = calculate_sum_up_to(5)
print("Computed sum:", result)
`,
    expectedOutput: '15',
    actualOutput: '10',
    userDescription: 'The code runs without any error messages, but the calculation is completely wrong. For n = 5 I expected 15, but it returns 10.',
  },
  {
    id: 'java-null-pointer',
    title: 'Java — NullPointerException',
    category: 'Runtime Error',
    language: 'java',
    tagline: 'NullPointerException when invoking method on uninitialized or null object reference',
    code: `public class UserManager {
    private String databaseConnection;
    private CacheService cache;

    public UserManager() {
        this.databaseConnection = "jdbc:postgresql://localhost:5432/main";
        // Bug: cache service is never initialized!
    }

    public String getUserEmail(String userId) {
        if (userId == null) {
            return null;
        }
        // Throws NullPointerException if cache is null
        String cachedEmail = cache.get(userId);
        if (cachedEmail != null) {
            return cachedEmail;
        }
        return "user@" + userId + ".com";
    }

    public static void main(String[] args) {
        UserManager manager = new UserManager();
        System.out.println(manager.getUserEmail("dev_42"));
    }
}
`,
    error: 'Exception in thread "main" java.lang.NullPointerException: Cannot invoke "CacheService.get(String)" because "this.cache" is null\n\tat UserManager.getUserEmail(UserManager.java:15)',
    expectedOutput: 'user@dev_42.com',
    actualOutput: 'java.lang.NullPointerException',
    userDescription: 'Why does this work sometimes in mock tests but fail in production with NullPointerException when fetching emails?',
  },
  {
    id: 'security-sqli-and-secret',
    title: 'Security — Exposed Secret & SQL Injection',
    category: 'Security Issue',
    language: 'javascript',
    tagline: 'High severity security risk: hardcoded API key and unsanitized SQL query concatenation',
    code: `const API_KEY = "AIzaSyD9x82QkLmnOPQrStUvWxYz1234567";
const express = require('express');
const app = express();

app.get('/api/users', async (req, res) => {
  const searchTerm = req.query.q;
  
  // High Risk Bug: Raw string concatenation introduces SQL Injection!
  const query = "SELECT * FROM users WHERE username = '" + searchTerm + "'";
  const results = await db.query(query);
  
  res.json(results);
});
`,
    error: 'Security Audit Warning: Unsanitized input directly concatenated into SQL statement & Hardcoded API secret detected',
    expectedOutput: 'Secure parameterized SQL query with environment-based credential loading',
    actualOutput: 'Vulnerable to SQL Injection: payload "admin\' OR 1=1 --" dumps entire database',
    userDescription: 'Our security scanner flagged this endpoint as critical. What is the actual vulnerability and how do we securely fix it?',
  }
];
