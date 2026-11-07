// Prints, as JSON, the parts of the Client SDK contract that api_reference.py documents and that are not in
// typescript/schema/backend.openapi.json:
//   zod      the JSON Schema of the SDK's own zod schemas (generate inputs, Script and Storyboard content), from
//            z.toJSONSchema, so `.describe()` text, defaults and limits come straight from the source;
//   clients  the public client interfaces (StoreClients and the others listed below), read with the TypeScript
//            checker: every method with its parameters, and every property with its TSDoc.
// The sources are read as they are (reference_loader.mjs transpiles them), so no SDK build is needed.
import { register, createRequire } from 'node:module';
import { realpathSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const sdk = join(here, '..', 'typescript');
const src = join(sdk, 'src');
register('./reference_loader.mjs', import.meta.url);

// The zod instance the sources import: `.describe()` text lives in its global registry.
const zodEntry = realpathSync(join(createRequire(join(sdk, 'package.json')).resolve('zod'), '..', 'index.js'));
const { z } = await import(pathToFileURL(zodEntry).href);
const generation = await import(pathToFileURL(join(src, 'generation-schemas.ts')).href);
const content = await import(pathToFileURL(join(src, 'script-v3.ts')).href);

const json = (schema, io) => z.toJSONSchema(schema, { io, unrepresentable: 'any', target: 'draft-2020-12' });
const zod = {
	NewScriptInput: json(generation.newScriptSchema, 'input'),
	ReviseScriptInput: json(generation.reviseScriptSchema, 'input'),
	NewStoryboardInput: json(generation.newStoryboardSchema, 'input'),
	ReviseStoryboardInput: json(generation.reviseStoryboardSchema, 'input'),
	GeneratePromptInput: json(generation.generatePromptSchema, 'input'),
	ScriptContent: json(content.scriptSchema, 'output'),
	StoryboardContent: json(content.storyboardSchema, 'output'),
};

// ── Client interfaces ────────────────────────────────────────────────────
const ts = createRequire(join(here, 'package.json'))('typescript');
const program = ts.createProgram([join(src, 'index.ts')], {
	target: ts.ScriptTarget.ES2022,
	module: ts.ModuleKind.ESNext,
	moduleResolution: ts.ModuleResolutionKind.Bundler,
	strict: true,
	noEmit: true,
	skipLibCheck: true,
	types: [],
	lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
	baseUrl: here,
	paths: { '@nuva/protocol': [join(here, '..', 'protocol', 'src', 'index.ts')] },
});
const checker = program.getTypeChecker();
const declared = new Map();
for (const file of program.getSourceFiles()) {
	if (file.isDeclarationFile) continue;
	ts.forEachChild(file, (node) => {
		if ((ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && !declared.has(node.name.text)) declared.set(node.name.text, node);
	});
}
const doc = (symbol) => ts.displayPartsToString(symbol.getDocumentationComment(checker)).replace(/\s+/g, ' ').trim();
// A union of string literals (such as ShareableKind) is spelled out; anything else is printed as the checker names it.
const typeText = (type, at) => {
	const value = checker.getNonNullableType(type);
	if (value.isUnion() && value.types.every((member) => member.isStringLiteral())) return value.types.map((member) => JSON.stringify(member.value)).join(' | ');
	if (value.isStringLiteral()) return JSON.stringify(value.value);
	return checker.typeToString(value, at, ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope);
};
const methodsOf = (type, at) =>
	checker
		.getPropertiesOfType(type)
		.map((property) => {
			const value = checker.getTypeOfSymbolAtLocation(property, at);
			const signature = value.getCallSignatures()[0];
			if (signature === undefined) return { name: property.name, kind: 'property', type: typeText(value, at), optional: (property.flags & ts.SymbolFlags.Optional) !== 0, doc: doc(property) };
			return {
				name: property.name,
				kind: 'method',
				doc: doc(property),
				parameters: signature.getParameters().map((parameter) => {
					const declaration = parameter.valueDeclaration;
					return {
						name: parameter.name,
						optional: declaration !== undefined && ts.isParameter(declaration) && (declaration.questionToken !== undefined || declaration.initializer !== undefined),
						type: typeText(checker.getTypeOfSymbolAtLocation(parameter, at), at),
					};
				}),
				returns: typeText(signature.getReturnType(), at),
			};
		});
const interfaceOf = (name) => {
	const node = declared.get(name);
	if (node === undefined) throw new Error(`No declaration named ${name} in the SDK sources.`);
	return { node, type: checker.getTypeAtLocation(node.name) };
};
const clients = {};
// StoreClients: each property is one client (`products`, `videos`, …) and its methods.
{
	const { node, type } = interfaceOf('StoreClients');
	clients.StoreClients = Object.fromEntries(
		checker.getPropertiesOfType(type).map((property) => [property.name, methodsOf(checker.getTypeOfSymbolAtLocation(property, node), node)]),
	);
}
// The other public interfaces the reference documents member by member.
for (const name of ['NuvaClient', 'SessionsClient', 'AgentHandle', 'SessionFilesClient', 'NuvaClientOptions', 'AccessToken', 'SessionFile', 'StoreCommandOptions', 'ResultOptions', 'ShareTarget', 'Share', 'EntityRef', 'StoreQuery', 'CommandOptions']) {
	const { node, type } = interfaceOf(name);
	clients[name] = methodsOf(type, node);
}
// Job: the JobOut fields plus the methods the SDK adds.
{
	const { node, type } = interfaceOf('Job');
	clients.Job = methodsOf(type, node).filter((member) => member.kind === 'method');
}
process.stdout.write(JSON.stringify({ zod, clients }, null, 1) + '\n');
