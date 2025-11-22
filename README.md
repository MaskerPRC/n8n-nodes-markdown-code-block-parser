# n8n-nodes-markdown-code-block-parser

n8n community node to parse all code blocks from Markdown text.

## Features

- Parse all code blocks from Markdown text
- Extract code content, language identifier, line numbers, and fence type
- Support both ``` and ~~~ fence types
- Filter options for empty blocks and blocks without language

## Installation

```bash
npm install n8n-nodes-markdown-code-block-parser
```

## Usage

1. Add the "Markdown Code Block Parser" node to your workflow
2. Enter or paste your Markdown text in the "Markdown Text" field
3. Configure output options:
   - **Output Field Name**: Name of the output field (default: `codeBlocks`)
   - **Include Empty Blocks**: Whether to include empty code blocks
   - **Include Blocks Without Language**: Whether to include code blocks without language identifier

## Output

The node outputs an array of code blocks, each containing:
- `code`: The code content
- `language`: Language identifier (e.g., `javascript`, `python`) or `null`
- `index`: Index in the document (0-based)
- `fence`: Fence type used (` ``` ` or ` ~~~ `)
- `startLine`: Starting line number in the original Markdown
- `endLine`: Ending line number in the original Markdown

## Example

Input Markdown:
````markdown
# Example

```javascript
console.log('Hello');
```

```python
print('World')
```
````

Output:
```json
{
  "codeBlocks": [
    {
      "code": "console.log('Hello');",
      "language": "javascript",
      "index": 0,
      "fence": "```",
      "startLine": 3,
      "endLine": 5
    },
    {
      "code": "print('World')",
      "language": "python",
      "index": 1,
      "fence": "```",
      "startLine": 7,
      "endLine": 9
    }
  ]
}
```

## License

MIT

