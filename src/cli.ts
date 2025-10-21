#!/usr/bin/env node
import { Command } from 'commander';
import { initializeSequelize, initializeSequelizeFromDDL, generateOpenAPIDocument } from './generator/generator';
import { Theme, DEFAULT_THEME } from './constants';

const program = new Command();

program
  .version('1.0.0')
  .description('Generate OpenAPI documentation from a database')
  .option('-t, --type <type>', 'Database type (e.g., postgres, mysql)')
  .option('-h, --host <host>', 'Database host')
  .option('-p, --port <port>', 'Database port', parseInt)
  .option('-u, --username <username>', 'Database username')
  .option('-P, --password <password>', 'Database password')
  .option('-d, --database <database>', 'Database name')
  .option('-o, --output <file>', 'Output file for the OpenAPI document', 'openapi.json')
  .option('-e, --examples', 'Include generated response examples (deprecated alias)')
  .option('--response-examples', 'Include generated response examples', false)
  .option('-T, --theme <theme>', 'Theme for generated text fields (lorem|names|tech)', DEFAULT_THEME)
  .option('--ddl-file <path>', 'Path to a SQL DDL file to run against an in-memory sqlite instance')
  .action(async (options) => {
    let sequelize;
    if (options.ddlFile) {
      sequelize = await initializeSequelizeFromDDL(options.ddlFile);
    } else {
      // validate required DB connection fields
      const required = ['type', 'host', 'port', 'username', 'password', 'database'];
      const missing = required.filter((r) => !options[r]);
      if (missing.length > 0) {
        console.error(`Missing required DB connection options: ${missing.join(', ')}. Or use --ddl-file to generate from a local DDL.`);
        process.exit(1);
      }
      const config = {
        type: options.type,
        host: options.host,
        port: options.port,
        username: options.username,
        password: options.password,
        database: options.database,
      };
      sequelize = await initializeSequelize(config);
    }
    const includeExamples = options.responseExamples || options.examples || false;
    await generateOpenAPIDocument(sequelize, options.output, includeExamples, options.theme);
  });

program.parse(process.argv);
