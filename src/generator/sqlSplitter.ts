// Lightweight SQL splitter that attempts to split SQL into executable statements while
// handling dollar-quoted bodies ($$...$$), single/double-quoted strings, and MySQL DELIMITER blocks.
// Not a full parser — suitable for common DDL migration files.

export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let i = 0;
  const len = sql.length;

  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;
  let inDollarQuote = false;
  let dollarTag = '';
  let delimiter = ';';

  while (i < len) {
    const ch = sql[i];
    const next2 = sql.substr(i, 2);
    // We'll use an if/else-if ladder instead of early continues to make flow explicit.
    if (!inSingleQuote && !inDoubleQuote && !inBlockComment && !inDollarQuote && next2 === '--') {
      // begin line comment
      inLineComment = true;
      i += 2; // skip the '--'
    } else if (inLineComment) {
      // skip until newline, but preserve the newline to keep statement boundaries
      if (ch === '\n') {
        inLineComment = false;
        current += '\n';
      }
      i++;
    } else if (!inSingleQuote && !inDoubleQuote && !inBlockComment && !inDollarQuote && next2 === '/*') {
      // begin block comment
      inBlockComment = true;
      i += 2; // skip the '/*'
    } else if (inBlockComment) {
      // skip until closing '*/'
      if (next2 === '*/') {
        i += 2;
        inBlockComment = false;
      } else {
        i++;
      }
    } else if (!inSingleQuote && !inDoubleQuote && !inDollarQuote && ch === '$') {
      // detect dollar-quote start ($tag$)
      const match = sql.slice(i).match(/^(\$[A-Za-z0-9_]*\$)/);
      if (match) {
        inDollarQuote = true;
        dollarTag = match[1];
        current += dollarTag;
        i += dollarTag.length;
      } else {
        // not a dollar tag, treat as normal char
        current += ch;
        i++;
      }
    } else if (inDollarQuote) {
      // handle dollar-quote end
      if (sql.substr(i, dollarTag.length) === dollarTag) {
        current += dollarTag;
        i += dollarTag.length;
        inDollarQuote = false;
        dollarTag = '';
      } else {
        current += ch;
        i++;
      }
    } else if (ch === "'" && !inDoubleQuote) {
      // toggle single quote
      inSingleQuote = !inSingleQuote;
      current += ch;
      i++;
    } else if (ch === '"' && !inSingleQuote) {
      // toggle double quote
      inDoubleQuote = !inDoubleQuote;
      current += ch;
      i++;
    } else if (!inSingleQuote && !inDoubleQuote) {
      // MySQL DELIMITER handling (very naive): look for line starting with DELIMITER <tok>
      const rest = sql.slice(i);
      const delimiterMatch = rest.match(/^DELIMITER\s+(\S+)/i);
      if (delimiterMatch) {
        delimiter = delimiterMatch[1];
        // consume the DELIMITER line
        const nl = rest.indexOf('\n');
        if (nl >= 0) {
          current += rest.slice(0, nl + 1);
          i += nl + 1;
        } else {
          // no newline, consume all
          current += rest;
          i = len;
        }
      } else if (!inSingleQuote && !inDoubleQuote && !inLineComment && !inBlockComment && !inDollarQuote) {
        // statement delimiter detection
        if (delimiter === ';') {
          if (ch === ';') {
            current += ch;
            const stmt = current.trim();
            if (stmt) statements.push(stmt);
            current = '';
            i++;
          } else {
            current += ch;
            i++;
          }
        } else {
          // custom delimiter: check if the next characters match
          if (sql.substr(i, delimiter.length) === delimiter) {
            current += delimiter;
            const stmt = current.trim();
            if (stmt) statements.push(stmt);
            current = '';
            i += delimiter.length;
          } else {
            current += ch;
            i++;
          }
        }
      } else {
        // default: append char
        current += ch;
        i++;
      }
    } else {
      // default: append char
      current += ch;
      i++;
    }
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements.map(s => s.trim()).filter(Boolean);
}
