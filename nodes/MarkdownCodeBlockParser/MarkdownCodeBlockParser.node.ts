import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

interface CodeBlock {
	code: string;
	language: string | null;
	index: number;
	fence: string;
	startLine: number;
	endLine: number;
}

export class MarkdownCodeBlockParser implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Markdown Code Block Parser',
		name: 'markdownCodeBlockParser',
		icon: { light: 'file:../../icons/markdown.svg', dark: 'file:../../icons/markdown.dark.svg' },
		group: ['transform'],
		version: 1,
		description: 'Parse all code blocks from Markdown text',
		defaults: {
			name: 'Markdown Code Block Parser',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Markdown Text',
				name: 'markdownText',
				type: 'string',
				typeOptions: {
					rows: 10,
				},
				default: '',
				placeholder: 'Enter or paste your Markdown text here...',
				description: 'The Markdown text to parse for code blocks',
				required: true,
			},
			{
				displayName: 'Output Field Name',
				name: 'outputFieldName',
				type: 'string',
				default: '',
				description: 'The name of the output field containing the array of code blocks. Leave empty to output each code block as a separate item.',
			},
			{
				displayName: 'Include Empty Blocks',
				name: 'includeEmpty',
				type: 'boolean',
				default: false,
				description: 'Whether to include empty code blocks in the output',
			},
			{
				displayName: 'Include Blocks Without Language',
				name: 'includeNoLanguage',
				type: 'boolean',
				default: true,
				description: 'Whether to include code blocks without language identifier',
			},
		],
	};

	/**
	 * Parse markdown text and extract all code blocks
	 */
	private static parseCodeBlocks(
		markdown: string,
		includeEmpty: boolean,
		includeNoLanguage: boolean,
	): CodeBlock[] {
		const codeBlocks: CodeBlock[] = [];
		const lines = markdown.split('\n');
		let currentBlock: {
			language: string | null;
			startLine: number;
			fence: string | null;
			codeLines: string[];
		} | null = null;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const lineNumber = i + 1; // 1-based line numbers

			// Check for code fence (``` or ~~~)
			// Match: at least 3 backticks or tildes, followed by optional language identifier
			// Language can be directly after fence or after whitespace
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
					
					// Only add if not empty or if includeEmpty is true
					if (code.trim() || includeEmpty) {
						// Only add if has language or if includeNoLanguage is true
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
						fence: currentBlock.fence!,
						startLine: currentBlock.startLine,
						endLine: lines.length,
					});
				}
			}
		}

		return codeBlocks;
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Get parameters
		const markdownText = this.getNodeParameter('markdownText', 0, '') as string;
		const outputFieldName = this.getNodeParameter('outputFieldName', 0, '') as string;
		const includeEmpty = this.getNodeParameter('includeEmpty', 0, false) as boolean;
		const includeNoLanguage = this.getNodeParameter('includeNoLanguage', 0, true) as boolean;

		if (!markdownText) {
			throw new NodeOperationError(this.getNode(), 'Markdown text is required');
		}

		// Parse code blocks
		const codeBlocks = MarkdownCodeBlockParser.parseCodeBlocks(markdownText, includeEmpty, includeNoLanguage);

		// Process each input item
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const item = items[itemIndex];

				if (!outputFieldName || outputFieldName.trim() === '') {
					// Output each code block as a separate item
					if (codeBlocks.length === 0) {
						// If no code blocks, output the original item
						returnData.push(item);
					} else {
						// Create one output item for each code block
						for (const codeBlock of codeBlocks) {
							const newItem: INodeExecutionData = {
								json: {
									...item.json,
									...codeBlock,
								},
								pairedItem: item.pairedItem,
							};
							returnData.push(newItem);
						}
					}
				} else {
					// Output all code blocks as an array in the specified field
					const newItem: INodeExecutionData = {
						json: {
							...item.json,
							[outputFieldName]: codeBlocks,
						},
						pairedItem: item.pairedItem,
					};
					returnData.push(newItem);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const errorItem: INodeExecutionData = {
						json: this.getInputData(itemIndex)[0].json,
						pairedItem: itemIndex,
					};
					if (error instanceof Error) {
						(errorItem as any).error = error;
					} else {
						(errorItem as any).error = new Error(String(error));
					}
					returnData.push(errorItem);
				} else {
					if (error instanceof Error) {
						if ('context' in error) {
							(error as any).context.itemIndex = itemIndex;
						}
						throw new NodeOperationError(this.getNode(), error, {
							itemIndex,
						});
					}
					throw new NodeOperationError(this.getNode(), new Error(String(error)), {
						itemIndex,
					});
				}
			}
		}

		return [returnData];
	}
}

