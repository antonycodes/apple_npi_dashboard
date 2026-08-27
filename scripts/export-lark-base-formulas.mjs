import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { gunzipSync, inflateSync } from "node:zlib";

const [sourcePath, outputPath] = process.argv.slice(2);

if (!sourcePath || !outputPath) {
  console.error("Usage: node scripts/export-lark-base-formulas.mjs <source.base> <output.md>");
  process.exit(1);
}

const sourceBuffer = readFileSync(sourcePath);
const source = JSON.parse(sourceBuffer.toString("utf8"));

function decodeCompressedJson(base64Value) {
  const compressed = Buffer.from(base64Value, "base64");
  let decoded;

  try {
    decoded = gunzipSync(compressed);
  } catch {
    decoded = inflateSync(compressed);
  }

  return JSON.parse(decoded.toString("utf8"));
}

const snapshots = decodeCompressedJson(source.gzipSnapshot);
const tableNames = new Map();
const tables = new Map();

for (const item of snapshots) {
  const schema = item?.schema;
  const table = schema?.data?.table;

  for (const [tableId, tableInfo] of Object.entries(schema?.tableMap ?? {})) {
    tableNames.set(tableId, tableInfo.name || tableId);
  }

  const tableId = table?.meta?.id;
  if (!tableId) continue;

  const previous = tables.get(tableId);
  const revision = table.meta.rev ?? 0;

  if (!previous || revision >= previous.revision) {
    tables.set(tableId, { revision, schema, table });
  }
}

const fieldNamesById = new Map();
const optionNamesById = new Map();

for (const { table } of tables.values()) {
  for (const [fieldId, field] of Object.entries(table.fieldMap ?? {})) {
    const names = fieldNamesById.get(fieldId) ?? new Set();
    names.add(field.name || fieldId);
    fieldNamesById.set(fieldId, names);

    const options = [
      ...(field?.property?.options ?? []),
      ...(field?.property?.type?.UIProperty?.options ?? []),
    ];

    for (const option of options) {
      const optionNames = optionNamesById.get(option.id) ?? new Set();
      optionNames.add(option.name);
      optionNamesById.set(option.id, optionNames);
    }
  }
}

function tableName(tableId) {
  return tableNames.get(tableId) || tableId;
}

function fieldName(tableId, fieldId) {
  return tables.get(tableId)?.table?.fieldMap?.[fieldId]?.name || fieldId;
}

function currentValueFieldName(fieldId) {
  const names = [...(fieldNamesById.get(fieldId) ?? [])];
  return names.length === 1 ? names[0] : fieldId;
}

function standaloneOptionName(optionId) {
  const names = [...(optionNamesById.get(optionId) ?? [])];
  return names.length === 1 ? names[0] : optionId;
}

function optionName(tableId, fieldId, optionId) {
  const field = tables.get(tableId)?.table?.fieldMap?.[fieldId];
  const optionGroups = [
    field?.property?.options,
    field?.property?.type?.UIProperty?.options,
  ];

  for (const options of optionGroups) {
    const match = options?.find((option) => option.id === optionId);
    if (match) return match.name;
  }

  return optionId;
}

function quote(value) {
  return `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function readableFormula(rawFormula, currentTableId) {
  return rawFormula
    .trim()
    .replace(
      /bitable::\$table\[([^\]]+)\]\.\$column\[([^\]]+)\]\.\$option\[([^\]]+)\]/g,
      (_, tableId, fieldId, optionId) => quote(optionName(tableId, fieldId, optionId)),
    )
    .replace(
      /bitable::\$table\[([^\]]+)\]\.\$field\[([^\]]+)\]\.\$option\[([^\]]+)\]/g,
      (_, tableId, fieldId, optionId) => quote(optionName(tableId, fieldId, optionId)),
    )
    .replace(
      /CurrentValue\.\$column\[([^\]]+)\]/g,
      (_, fieldId) => `CurrentValue.[${currentValueFieldName(fieldId)}]`,
    )
    .replace(
      /bitable::\$table\[([^\]]+)\]\.\$field\[([^\]]+)\]/g,
      (_, tableId, fieldId) =>
        tableId === currentTableId
          ? `[${fieldName(tableId, fieldId)}]`
          : `[${tableName(tableId)}].[${fieldName(tableId, fieldId)}]`,
    )
    .replace(
      /bitable::\$table\[([^\]]+)\]\.\$column\[([^\]]+)\]/g,
      (_, tableId, fieldId) => `[${tableName(tableId)}].[${fieldName(tableId, fieldId)}]`,
    )
    .replace(/bitable::\$table\[([^\]]+)\]/g, (_, tableId) => `[${tableName(tableId)}]`)
    .replace(/\.\$column\[([^\]]+)\]/g, (_, fieldId) => `.[${currentValueFieldName(fieldId)}]`)
    .replace(/\.\$field\[([^\]]+)\]/g, (_, fieldId) => `.[${currentValueFieldName(fieldId)}]`)
    .replace(/\.\$option\[([^\]]+)\]/g, (_, optionId) => quote(standaloneOptionName(optionId)));
}

function formulaKind(field) {
  if (field.type === 19) return "Lookup/Rollup";
  if (field.type === 20) return "Formula";
  return `Type ${field.type}`;
}

const tableInventories = [...tables.entries()]
  .map(([tableId, { table }]) => {
    const fields = Object.entries(table.fieldMap ?? {}).map(([fieldId, field]) => ({
      fieldId,
      field,
      formula: field?.property?.formula ?? "",
    }));

    return {
      tableId,
      name: tableName(tableId),
      formulas: fields.filter(({ formula }) => formula.trim() !== ""),
      emptyFormulas: fields.filter(
        ({ field, formula }) => (field.type === 19 || field.type === 20) && formula.trim() === "",
      ),
    };
  })
  .filter(({ formulas, emptyFormulas }) => formulas.length || emptyFormulas.length)
  .sort((a, b) => a.name.localeCompare(b.name, "vi"));

const formulaCount = tableInventories.reduce((sum, table) => sum + table.formulas.length, 0);
const emptyFormulaCount = tableInventories.reduce(
  (sum, table) => sum + table.emptyFormulas.length,
  0,
);
const checksum = createHash("sha256").update(sourceBuffer).digest("hex");
const unresolvedReferences = new Set();

for (const table of tableInventories) {
  for (const { formula } of table.formulas) {
    const readable = readableFormula(formula, table.tableId);
    for (const match of readable.matchAll(/\[((?:tbl|fld|opt)[A-Za-z0-9_]+)\]/g)) {
      unresolvedReferences.add(match[1]);
    }
  }
}

const lines = [];

lines.push("# Kho công thức Lark Base — Apple NPI Testing HCM 27.08");
lines.push("");
lines.push(`- Nguồn: \`${basename(sourcePath)}\``);
lines.push(`- SHA-256: \`${checksum}\``);
lines.push(`- Ngày tổng hợp: \`${new Date().toISOString()}\``);
lines.push(`- Số bảng có công thức: **${tableInventories.length}**`);
lines.push(`- Số công thức có nội dung: **${formulaCount}**`);
lines.push(`- Số trường Formula/Lookup đang trống: **${emptyFormulaCount}**`);
lines.push("");
lines.push("> Công thức dễ đọc đã đổi ID nội bộ thành tên bảng và tên trường. Biểu thức gốc được giữ nguyên để đối chiếu chính xác với file xuất.");
lines.push("");

if (unresolvedReferences.size) {
  lines.push("## Cảnh báo tham chiếu không phân giải");
  lines.push("");
  lines.push("Các ID sau được giữ nguyên vì đối tượng không còn trong schema của file xuất:");
  lines.push("");
  for (const reference of [...unresolvedReferences].sort()) {
    lines.push(`- \`${reference}\``);
  }
  lines.push("");
}

lines.push("## Mục lục");
lines.push("");

for (const table of tableInventories) {
  lines.push(`- [${table.name}](#table-${table.tableId.toLowerCase()}) — ${table.formulas.length} công thức`);
}

for (const table of tableInventories) {
  lines.push("");
  lines.push(`<a id="table-${table.tableId.toLowerCase()}"></a>`);
  lines.push("");
  lines.push(`## ${table.name}`);
  lines.push("");
  lines.push(`- Table ID: \`${table.tableId}\``);
  lines.push(`- Công thức có nội dung: **${table.formulas.length}**`);
  lines.push("");

  for (const { fieldId, field, formula } of table.formulas) {
    lines.push(`### ${field.name || fieldId}`);
    lines.push("");
    lines.push(`- Field ID: \`${fieldId}\``);
    lines.push(`- Loại: \`${formulaKind(field)}\``);
    lines.push("");
    lines.push("Công thức theo tên:");
    lines.push("");
    lines.push("```text");
    lines.push(readableFormula(formula, table.tableId));
    lines.push("```");
    lines.push("");
    lines.push("<details>");
    lines.push("<summary>Biểu thức gốc trong file Base</summary>");
    lines.push("");
    lines.push("```text");
    lines.push(formula.trim());
    lines.push("```");
    lines.push("");
    lines.push("</details>");
    lines.push("");
  }

  if (table.emptyFormulas.length) {
    lines.push("### Trường Formula/Lookup đang trống");
    lines.push("");
    for (const { fieldId, field } of table.emptyFormulas) {
      lines.push(`- \`${field.name || fieldId}\` — \`${fieldId}\` — ${formulaKind(field)}`);
    }
    lines.push("");
  }
}

writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
console.log(JSON.stringify({ outputPath, formulaCount, emptyFormulaCount }, null, 2));
