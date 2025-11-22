const fs = require('fs');
const path = require('path');

// 解析函数（从节点代码中复制）
function parseCodeBlocks(markdown, includeEmpty = false, includeNoLanguage = true) {
	const codeBlocks = [];
	const lines = markdown.split('\n');
	let currentBlock = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const lineNumber = i + 1;

		// Check for code fence (``` or ~~~)
		const fenceMatch = line.match(/^(`{3,}|~{3,})(?:\s+([^\s]+)|([^\s]+))?\s*$/);
		
		if (fenceMatch) {
			const fence = fenceMatch[1];
			// Language can be in match[2] (with space) or match[3] (without space)
			const language = fenceMatch[2] || fenceMatch[3] || null;

			if (currentBlock === null) {
				// Starting a new code block
				currentBlock = {
					language,
					startLine: lineNumber,
					fence,
					codeLines: [],
				};
			} else if (currentBlock.fence === fence) {
				// Ending the current code block
				const code = currentBlock.codeLines.join('\n');
				
				if (code.trim() || includeEmpty) {
					if (currentBlock.language || includeNoLanguage) {
						codeBlocks.push({
							code,
							language: currentBlock.language,
							index: codeBlocks.length,
							fence: currentBlock.fence,
							startLine: currentBlock.startLine,
							endLine: lineNumber,
						});
					}
				}
				
				currentBlock = null;
			} else {
				// Fence type mismatch - add to code content
				currentBlock.codeLines.push(line);
			}
		} else if (currentBlock !== null) {
			// Inside a code block, add line to code
			currentBlock.codeLines.push(line);
		}
	}

	// Handle unclosed code blocks (if any)
	if (currentBlock !== null) {
		const code = currentBlock.codeLines.join('\n');
		if (code.trim() || includeEmpty) {
			if (currentBlock.language || includeNoLanguage) {
				codeBlocks.push({
					code,
					language: currentBlock.language,
					index: codeBlocks.length,
					fence: currentBlock.fence,
					startLine: currentBlock.startLine,
					endLine: lines.length,
				});
			}
		}
	}

	return codeBlocks;
}

// 测试函数
function runTest(testFile, expected, description) {
	console.log(`\n${'='.repeat(60)}`);
	console.log(`测试: ${description}`);
	console.log(`文件: ${testFile}`);
	console.log(`${'='.repeat(60)}`);
	
	const markdown = fs.readFileSync(testFile, 'utf8');
	const result = parseCodeBlocks(markdown);
	
	console.log(`\n预期: ${expected.description}`);
	console.log(`实际结果:`);
	console.log(JSON.stringify(result, null, 2));
	
	const passed = expected.validator(result);
	console.log(`\n结果: ${passed ? '✓ 通过' : '✗ 失败'}`);
	
	return passed;
}

// 运行所有测试
console.log('开始测试 Markdown Code Block Parser...\n');

const testDir = path.join(__dirname, 'test-markdown');
const tests = [
	{
		file: path.join(testDir, 'basic.md'),
		expected: {
			description: '2个代码块 (javascript 和 python)',
			validator: (result) => 
				result.length === 2 && 
				result[0].language === 'javascript' && 
				result[1].language === 'python'
		}
	},
	{
		file: path.join(testDir, 'no-language.md'),
		expected: {
			description: '1个代码块 (language为null)',
			validator: (result) => 
				result.length === 1 && 
				result[0].language === null
		}
	},
	{
		file: path.join(testDir, 'empty-block.md'),
		expected: {
			description: '0个代码块 (includeEmpty=false)',
			validator: (result) => result.length === 0
		}
	},
	{
		file: path.join(testDir, 'multiple-blocks.md'),
		expected: {
			description: '3个代码块 (js, typescript, bash)',
			validator: (result) => 
				result.length === 3 && 
				result[0].language === 'js' && 
				result[1].language === 'typescript' && 
				result[2].language === 'bash'
		}
	},
	{
		file: path.join(testDir, 'mixed-fences.md'),
		expected: {
			description: '2个代码块 (使用 ~~~ 和 ```)',
			validator: (result) => 
				result.length === 2 && 
				result[0].fence === '~~~' && 
				result[1].fence === '```'
		}
	},
	{
		file: path.join(testDir, 'complex-code.md'),
		expected: {
			description: '1个代码块，包含函数定义',
			validator: (result) => 
				result.length === 1 && 
				result[0].code.includes('function')
		}
	},
	{
		file: path.join(testDir, 'real-world.md'),
		expected: {
			description: '3个代码块 (javascript, python, bash)',
			validator: (result) => 
				result.length === 3 && 
				result[0].language === 'javascript' && 
				result[1].language === 'python' && 
				result[2].language === 'bash'
		}
	}
];

let passedCount = 0;
let totalCount = tests.length;

tests.forEach((test, index) => {
	const passed = runTest(test.file, test.expected, `测试 ${index + 1}`);
	if (passed) passedCount++;
});

console.log(`\n${'='.repeat(60)}`);
console.log(`测试总结: ${passedCount}/${totalCount} 通过`);
console.log(`${'='.repeat(60)}\n`);

process.exit(passedCount === totalCount ? 0 : 1);

