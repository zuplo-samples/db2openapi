import { splitSqlStatements } from '../src/generator/sqlSplitter';

describe('SQL splitter', () => {
  test('splits simple statements by semicolon', () => {
    const sql = `CREATE TABLE a (id INT);\nCREATE TABLE b (id INT);`;
    const stmts = splitSqlStatements(sql);
    expect(stmts.length).toBe(2);
    expect(stmts[0].toUpperCase().startsWith('CREATE TABLE A')).toBeTruthy();
  });

  test('does not split on semicolon inside single quotes', () => {
    const sql = `INSERT INTO t (s) VALUES ('semi;colon');\nSELECT 1;`;
    const stmts = splitSqlStatements(sql);
    expect(stmts.length).toBe(2);
    expect(stmts[0].includes("semi;colon")).toBeTruthy();
  });

  test('handles dollar-quoted function bodies', () => {
    const sql = `CREATE FUNCTION f() RETURNS void AS $$\nBEGIN\n  PERFORM 1;\nEND;\n$$ LANGUAGE plpgsql;`;
    const stmts = splitSqlStatements(sql);
    expect(stmts.length).toBe(1);
    expect(stmts[0].includes('LANGUAGE plpgsql')).toBeTruthy();
  });

  test('handles DELIMITER blocks (MySQL)', () => {
    const sql = `DELIMITER $$\nCREATE PROCEDURE p()\nBEGIN\n  SELECT 1;\nEND$$\nDELIMITER ;\n`;
    const stmts = splitSqlStatements(sql);
    // Expect 2 statements: the CREATE PROCEDURE and maybe the DELIMITER commands preserved
    expect(stmts.some(s => /CREATE PROCEDURE/i.test(s))).toBeTruthy();
  });

  test('does not split on semicolon inside double quotes', () => {
    const sql = `INSERT INTO t (s) VALUES ("semi;colon");\nSELECT 1;`;
    const stmts = splitSqlStatements(sql);
    expect(stmts.length).toBe(2);
    expect(stmts[0].includes('semi;colon')).toBeTruthy();
  });

  test('DELIMITER without newline consumes rest of input', () => {
    // DELIMITER declared but no newline after it -> ensures branch where nl < 0 is exercised
    const sql = `DELIMITER $$CREATE PROCEDURE p() BEGIN SELECT 1; END$$`;
    const stmts = splitSqlStatements(sql);
    expect(stmts.some(s => /CREATE PROCEDURE/i.test(s))).toBeTruthy();
  });

  test('matches custom multi-character delimiter inside content', () => {
    // switch delimiters and ensure a custom delimiter (e.g. '||') is detected inside the stream
    const sql = `DELIMITER %%\nCREATE PROCEDURE p()\nBEGIN\n  SELECT 1;\nEND%%\nDELIMITER ||\nINSERT INTO t VALUES (1)||\nSELECT 2;`;
    const stmts = splitSqlStatements(sql);
    expect(stmts.some(s => /INSERT INTO T/i.test(s))).toBeTruthy();
  });

  test('strips comments without breaking statements', () => {
    const sql = `-- create a\nCREATE TABLE t (id INT); /* inline comment ; with semicolon */\nINSERT INTO t VALUES (1);`;
    const stmts = splitSqlStatements(sql);
    expect(stmts.length).toBe(2);
    expect(stmts[0].toUpperCase().startsWith('CREATE TABLE T')).toBeTruthy();
  });
});
